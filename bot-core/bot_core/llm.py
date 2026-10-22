"""Capa de modelo. El motor solo conoce `LLM`; Gemini es una implementacion.

Mensajes neutrales:
  {"role":"user","text":str}
  {"role":"assistant","text":str,"tool_calls":[{"name","args"}], "raw": <opaco del proveedor>}
  {"role":"tool","name":str,"result":dict}
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

log = logging.getLogger("bot_core.llm")


class LLMError(Exception):
    pass


@dataclass
class ToolCall:
    name: str
    args: dict


@dataclass
class LLMResponse:
    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    raw: Any = None


class LLM(Protocol):
    async def generate(self, *, system: str, messages: list[dict], tools: list[dict]) -> LLMResponse: ...
    async def complete(self, *, system: str, prompt: str) -> str: ...


def _to_gemini_schema(types_mod: Any, js: dict) -> Any:
    kind = js.get("type", "string").upper()
    kw: dict[str, Any] = {"type": kind}
    if "description" in js:
        kw["description"] = js["description"]
    if "enum" in js:
        kw["enum"] = [str(v) for v in js["enum"]]
    if kind == "OBJECT":
        kw["properties"] = {k: _to_gemini_schema(types_mod, v) for k, v in js.get("properties", {}).items()}
        if js.get("required"):
            kw["required"] = js["required"]
    return types_mod.Schema(**kw)


class GeminiLLM:
    def __init__(self, api_key: str, model: str, fallbacks: list[str] | None = None, temperature: float = 0.4):
        from google import genai
        from google.genai import types
        if not api_key:
            raise LLMError("GEMINI_API_KEY no configurada")
        self._genai, self._types = genai, types
        # timeout (ms): sin esto una llamada colgada deja el chat "Escribiendo..." para siempre
        self.client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=25_000))
        self.model = model
        self.models = [model] + [m for m in (fallbacks or []) if m != model]
        self.temperature = temperature

    # --- conversion de mensajes neutrales -> Content de Gemini ---------------
    def _contents(self, messages: list[dict]) -> list[Any]:
        t = self._types
        out: list[Any] = []
        i = 0
        while i < len(messages):
            m = messages[i]
            role = m["role"]
            if role == "user":
                out.append(t.Content(role="user", parts=[t.Part.from_text(text=m["text"])]))
            elif role == "assistant":
                if m.get("raw") is not None:      # conserva firmas de razonamiento de Gemini
                    out.append(m["raw"])
                else:
                    out.append(t.Content(role="model", parts=[t.Part.from_text(text=m.get("text") or "")]))
            elif role == "tool":
                # llamadas paralelas: todas las respuestas consecutivas van en UN solo Content
                parts = []
                while i < len(messages) and messages[i]["role"] == "tool":
                    tm = messages[i]
                    parts.append(t.Part.from_function_response(name=tm["name"], response={"output": tm["result"]}))
                    i += 1
                out.append(t.Content(role="user", parts=parts))
                continue
            i += 1
        return out

    def _config(self, system: str, tools: list[dict]) -> Any:
        t = self._types
        kw: dict[str, Any] = dict(system_instruction=system, temperature=self.temperature)
        if tools:
            decls = []
            for d in tools:
                params = d["parameters"]
                decls.append(t.FunctionDeclaration(
                    name=d["name"], description=d["description"],
                    parameters=_to_gemini_schema(t, params) if params.get("properties") else None,
                ))
            kw["tools"] = [t.Tool(function_declarations=decls)]
            kw["automatic_function_calling"] = t.AutomaticFunctionCallingConfig(disable=True)
        return t.GenerateContentConfig(**kw)

    async def _call(self, contents: list[Any], config: Any) -> Any:
        """Prueba cada modelo en orden. Saturacion (429/500/503) -> 1 reintento y luego el siguiente modelo;
        modelo inexistente (404) -> siguiente modelo; cualquier otro error (clave invalida, etc.) -> falla ya."""
        last: Exception | None = None
        for model in self.models:
            for attempt in range(2):
                try:
                    log.info("Gemini: llamando a %s (intento %d)", model, attempt + 1)
                    return await self.client.aio.models.generate_content(
                        model=model, contents=contents, config=config)
                except Exception as e:                      # noqa: BLE001
                    last = e
                    code = getattr(e, "code", None)
                    log.warning("Gemini %s fallo (%s): %s", model, code, str(e)[:200])
                    if code in (429, 500, 503) and attempt == 0:
                        await asyncio.sleep(1.5)
                        continue
                    if code in (404, 429, 500, 503):
                        break                               # probar el siguiente modelo
                    raise LLMError("El modelo no esta disponible ahora mismo") from e
        log.error("Gemini fallo en todos los modelos: %s: %s", type(last).__name__, last)
        raise LLMError("El modelo no esta disponible ahora mismo") from last

    async def generate(self, *, system: str, messages: list[dict], tools: list[dict]) -> LLMResponse:
        resp = await self._call(self._contents(messages), self._config(system, tools))
        cands = getattr(resp, "candidates", None) or []
        if not cands or not getattr(cands[0], "content", None) or not cands[0].content.parts:
            return LLMResponse(text="")
        content = cands[0].content
        text = "".join(p.text for p in content.parts if getattr(p, "text", None) and not getattr(p, "thought", False))
        calls = [ToolCall(p.function_call.name, dict(p.function_call.args or {}))
                 for p in content.parts if getattr(p, "function_call", None)]
        return LLMResponse(text=text.strip(), tool_calls=calls, raw=content)

    async def complete(self, *, system: str, prompt: str) -> str:
        t = self._types
        cfg = t.GenerateContentConfig(system_instruction=system, temperature=0.2)
        resp = await self._call([t.Content(role="user", parts=[t.Part.from_text(text=prompt)])], cfg)
        return (getattr(resp, "text", "") or "").strip()
