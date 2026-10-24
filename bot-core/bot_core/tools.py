"""Registro de herramientas (tools) con permisos, confirmacion y esquema automatico.

Reglas de seguridad que impone el registro:
  * `ctx` (usuario, token, ids) lo inyecta el codigo; el modelo NUNCA lo rellena
    ni lo ve en el esquema.
  * Una tool puede limitarse a ciertos roles.
  * Una tool con confirm=True no se ejecuta cuando la pide el modelo: se crea una
    accion pendiente que el usuario aprueba desde la interfaz.
"""
from __future__ import annotations

import asyncio
import inspect
import typing
from dataclasses import dataclass, field
from typing import Any, Callable, Literal, get_args, get_origin


class ToolError(Exception):
    """Error 'de negocio' con mensaje seguro para mostrar al modelo/usuario."""


@dataclass
class ToolContext:
    project_id: str
    user_id: str           # id externo (id_paciente)
    role: str
    token: str             # JWT del usuario, para reenviarlo al backend
    bot_user_id: int
    conversation_id: str
    store: Any = None      # acceso a la memoria (lo usan las tools genericas)


@dataclass
class ToolSpec:
    name: str
    description: str
    fn: Callable[..., Any]
    schema: dict
    roles: frozenset[str] | None = None
    confirm: bool = False
    summary: Callable[[dict], str] | None = None
    success_message: Callable[[dict], str] | None = None
    note: Callable[[dict, dict], str] | None = None   # resumen compacto (args, resultado) que se recuerda entre turnos

    def allowed_for(self, role: str) -> bool:
        return self.roles is None or role in self.roles


_PRIMITIVES = {str: "string", int: "integer", float: "number", bool: "boolean"}


def _json_type(tp: Any) -> dict:
    origin = get_origin(tp)
    if origin is typing.Annotated:
        base, *meta = get_args(tp)
        out = _json_type(base)
        for m in meta:
            if isinstance(m, str):
                out["description"] = m
        return out
    if origin is Literal:
        vals = list(get_args(tp))
        return {"type": _PRIMITIVES.get(type(vals[0]), "string"), "enum": vals}
    if origin in (typing.Union, getattr(__import__("types"), "UnionType", None)):
        args = [a for a in get_args(tp) if a is not type(None)]
        return _json_type(args[0]) if args else {"type": "string"}
    if tp in _PRIMITIVES:
        return {"type": _PRIMITIVES[tp]}
    return {"type": "string"}


def _is_optional(tp: Any, has_default: bool) -> bool:
    if has_default:
        return True
    origin = get_origin(tp)
    if origin is typing.Annotated:
        return _is_optional(get_args(tp)[0], has_default)
    return type(None) in get_args(tp) if origin else False


def build_schema(fn: Callable[..., Any]) -> dict:
    sig = inspect.signature(fn)
    hints = typing.get_type_hints(fn, include_extras=True)
    props: dict[str, dict] = {}
    required: list[str] = []
    for i, (pname, p) in enumerate(sig.parameters.items()):
        if i == 0 and pname == "ctx":
            continue
        tp = hints.get(pname, str)
        props[pname] = _json_type(tp)
        if not _is_optional(tp, p.default is not inspect.Parameter.empty):
            required.append(pname)
    return {"type": "object", "properties": props, "required": required}


def _coerce(value: Any, schema: dict) -> Any:
    t = schema.get("type")
    try:
        if t == "integer":
            return int(value)
        if t == "number":
            return float(value)
        if t == "boolean":
            return value if isinstance(value, bool) else str(value).lower() in ("true", "1", "si", "sí")
        v = str(value)
    except (TypeError, ValueError):
        raise ToolError(f"valor invalido: {value!r}")
    if "enum" in schema and v not in schema["enum"]:
        raise ToolError(f"valor invalido {v!r}; opciones: {schema['enum']}")
    return v


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolSpec] = {}

    def tool(self, description: str, *, name: str | None = None, roles: list[str] | None = None,
             confirm: bool = False, summary: Callable[[dict], str] | None = None,
             success_message: Callable[[dict], str] | None = None,
             note: Callable[[dict, dict], str] | None = None):
        def deco(fn: Callable[..., Any]):
            spec = ToolSpec(
                name=name or fn.__name__, description=description, fn=fn, schema=build_schema(fn),
                roles=frozenset(roles) if roles else None, confirm=confirm,
                summary=summary, success_message=success_message, note=note,
            )
            if confirm and summary is None:
                raise ValueError(f"{spec.name}: una tool con confirm=True necesita summary=")
            self._tools[spec.name] = spec
            return fn
        return deco

    def get(self, name: str) -> ToolSpec | None:
        return self._tools.get(name)

    def for_role(self, role: str) -> list[ToolSpec]:
        return [t for t in self._tools.values() if t.allowed_for(role)]

    def clean_args(self, spec: ToolSpec, raw: dict | None) -> dict:
        raw = dict(raw or {})
        props = spec.schema["properties"]
        args = {k: _coerce(v, props[k]) for k, v in raw.items() if k in props and v is not None}
        missing = [r for r in spec.schema["required"] if r not in args]
        if missing:
            raise ToolError(f"faltan parametros: {', '.join(missing)}")
        return args

    async def invoke(self, spec: ToolSpec, ctx: ToolContext, args: dict) -> dict:
        """Ejecuta la tool (sin comprobar confirmacion: eso lo decide el motor)."""
        if inspect.iscoroutinefunction(spec.fn):
            res = await spec.fn(ctx, **args)
        else:
            res = await asyncio.to_thread(spec.fn, ctx, **args)
        return res if isinstance(res, dict) else {"result": res}
