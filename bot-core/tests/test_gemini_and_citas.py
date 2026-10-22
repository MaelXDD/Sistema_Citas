"""Valida GeminiLLM con los tipos reales del SDK (cliente simulado, sin red) y las tools de citas con httpx simulado."""
import httpx
import pytest
from google.genai import types

from bot_core.engine import BotEngine
from bot_core.llm import GeminiLLM, LLMError, LLMResponse, ToolCall
from bot_core.stores import InMemoryStore
from conftest import FakeLLM, principal


class _Models:
    def __init__(self, outcomes): self.outcomes, self.seen = list(outcomes), []
    async def generate_content(self, *, model, contents, config):
        self.seen.append((model, contents, config))
        o = self.outcomes.pop(0)
        if isinstance(o, Exception): raise o
        return o


def _gemini(outcomes):
    g = GeminiLLM("fake-key", "test-model")
    m = _Models(outcomes)
    g.client = type("C", (), {"aio": type("A", (), {"models": m})()})()
    return g, m


def _resp(*parts):
    return types.GenerateContentResponse(candidates=[types.Candidate(content=types.Content(role="model", parts=list(parts)))])


async def test_generate_parses_text_and_function_calls():
    fc = types.Part.from_function_call(name="horas_disponibles", args={"id_doctor": 3, "fecha": "2026-10-27"})
    g, m = _gemini([_resp(fc), _resp(types.Part.from_text(text="Hola"))])
    tools = [{"name": "t", "description": "d", "parameters": {"type": "object", "properties": {"x": {"type": "integer"}}, "required": ["x"]}}]
    r = await g.generate(system="sys", messages=[{"role": "user", "text": "hi"}], tools=tools)
    assert r.tool_calls == [ToolCall("horas_disponibles", {"id_doctor": 3, "fecha": "2026-10-27"})]
    assert r.raw.role == "model"
    cfg = m.seen[0][2]
    assert cfg.automatic_function_calling.disable is True and cfg.system_instruction == "sys"
    assert cfg.tools[0].function_declarations[0].name == "t"
    r2 = await g.generate(system="s", messages=[{"role": "user", "text": "hi"}], tools=[])
    assert r2.text == "Hola" and not r2.tool_calls


async def test_generate_handles_empty_and_blocked_response():
    g, _ = _gemini([types.GenerateContentResponse(candidates=[]), _resp()])
    assert (await g.generate(system="s", messages=[{"role": "user", "text": "x"}], tools=[])).text == ""
    assert (await g.generate(system="s", messages=[{"role": "user", "text": "x"}], tools=[])).text == ""


async def test_retry_on_503_then_ok_and_final_failure(monkeypatch):
    import asyncio
    async def nosleep(_): pass
    monkeypatch.setattr(asyncio, "sleep", nosleep)
    class E(Exception): code = 503
    g, m = _gemini([E(), _resp(types.Part.from_text(text="ok"))])
    assert (await g.generate(system="s", messages=[{"role": "user", "text": "x"}], tools=[])).text == "ok"
    g2, _ = _gemini([E(), E(), E()])
    with pytest.raises(LLMError):
        await g2.generate(system="s", messages=[{"role": "user", "text": "x"}], tools=[])
    class Bad(Exception): code = 400
    g3, m3 = _gemini([Bad()])
    with pytest.raises(LLMError): await g3.generate(system="s", messages=[{"role": "user", "text": "x"}], tools=[])
    assert len(m3.seen) == 1                         # 400 no se reintenta


# ------------------------------------------------------------------ proyecto citas
def _citas_engine(handler, llm, settings):
    from projects.citas.backend import CitasBackend
    from projects.citas.project import CitasProject
    api = CitasBackend("http://spring")
    api.http = httpx.AsyncClient(base_url="http://spring", transport=httpx.MockTransport(handler))
    proj = CitasProject(api)
    return BotEngine(settings, InMemoryStore(), llm, proj), proj


def test_citas_tools_schemas_are_valid_for_gemini():
    from projects.citas.project import CitasProject
    from projects.citas.backend import CitasBackend
    from bot_core.llm import _to_gemini_schema
    p = CitasProject(CitasBackend("http://x"))
    names = {t.name for t in p.registry.for_role("PACIENTE")}
    assert {"listar_especialidades", "doctores_por_especialidad", "horas_disponibles", "mis_citas",
            "preparar_reserva", "cancelar_cita"} <= names
    for t in p.registry.for_role("PACIENTE"):
        _to_gemini_schema(types, t.schema)
    prep = p.registry.get("preparar_reserva").schema
    assert prep["required"] == ["id_doctor", "fecha", "hora"] and "motivo" not in prep["required"]
    assert p.registry.get("cancelar_cita").confirm is True


async def test_citas_reserva_forwards_token_and_returns_ui(settings):
    seen = {}
    def handler(req: httpx.Request):
        seen["auth"], seen["path"], seen["body"] = req.headers.get("authorization"), req.url.path, req.content
        if req.url.path == "/api/bot/contexto":
            return httpx.Response(200, json={"citasAtendidas": 2, "citasCanceladas": 0, "proximaCita": "n.º 4, martes 27/10/2026 a las 10:00"})
        return httpx.Response(200, json={"resumen": "Dr. X, 10:00", "citaPendiente": {"fechaCita": "2026-10-27", "horaCita": "10:00:00"}})
    llm = FakeLLM([LLMResponse(tool_calls=[ToolCall("preparar_reserva", {"id_doctor": 3, "fecha": "2026-10-27", "hora": "10:00"})]),
                   LLMResponse(text="Listo")])
    eng, proj = _citas_engine(handler, llm, settings)
    r = await eng.chat(principal("5"), "reserva")
    assert seen["auth"] == "Bearer tok" and seen["path"] == "/api/bot/reservas/validar"
    assert r.ui_actions[0]["type"] == "open_checkout" and r.ui_actions[0]["citaPendiente"]["horaCita"] == "10:00:00"
    assert "Próxima cita: n.º 4" in llm.calls[0]["system"]          # el contexto personalizado llega al prompt
    assert "turno_preferido" in {t["name"]: t for t in llm.calls[0]["tools"]}["recordar_dato"]["parameters"]["properties"]["clave"]["enum"]


async def test_citas_backend_errors_are_user_friendly(settings):
    def handler(req):
        if req.url.path.endswith("/mis-citas"): return httpx.Response(401)
        if req.url.path.endswith("/disponibilidad"): return httpx.Response(409, json={"mensaje": "Ese horario ya no está disponible."})
        if req.url.path.endswith("/catalogo"): raise httpx.ConnectError("down")
        return httpx.Response(200, json={})
    llm = FakeLLM([LLMResponse(tool_calls=[ToolCall("mis_citas", {}), ToolCall("horas_disponibles", {"id_doctor": 1, "fecha": "2026-10-27"}),
                                           ToolCall("listar_especialidades", {})]), LLMResponse(text="x")])
    eng, _ = _citas_engine(handler, llm, settings)
    await eng.chat(principal(), "hola")
    res = [m["result"]["error"] for m in llm.calls[1]["messages"] if m["role"] == "tool"]
    assert "sesión expiró" in res[0] and "ya no está disponible" in res[1] and "no responde" in res[2]
