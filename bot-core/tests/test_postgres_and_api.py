import os, asyncio
import pytest
from fastapi.testclient import TestClient

from bot_core.api import create_app
from bot_core.engine import BotEngine
from bot_core.llm import LLMResponse, ToolCall
from bot_core.stores import InMemoryStore
from conftest import DemoProject, FakeLLM, SECRET, make_token, principal

PG = os.getenv("BOT_DATABASE_URL")


# ------------------------------------------------------------------ API HTTP
def _client(settings, script=None):
    proj, store, llm = DemoProject(), InMemoryStore(), FakeLLM(script)
    return TestClient(create_app(settings, proj, store, llm)), proj, store


def test_api_requires_valid_token(settings):
    c, *_ = _client(settings)
    assert c.get("/health").json()["status"] == "ok"
    assert c.post("/chat", json={"message": "hola"}).status_code == 401
    assert c.post("/chat", json={"message": "hola"}, headers={"Authorization": "Bearer basura"}).status_code == 401
    expired = make_token(exp_in=-5)
    assert c.post("/chat", json={"message": "hola"}, headers={"Authorization": f"Bearer {expired}"}).status_code == 401


def test_api_chat_confirm_and_forget(settings):
    c, proj, store = _client(settings, [
        LLMResponse(tool_calls=[ToolCall("cancelar", {"id_cita": 9})]), LLMResponse(text="Confirma")])
    h = {"Authorization": f"Bearer {make_token(sub='7', nombre='Ana')}"}
    r = c.post("/chat", json={"message": "cancela la 9"}, headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    aid = body["pending_actions"][0]["id"]
    # token de otro usuario no puede confirmar
    h2 = {"Authorization": f"Bearer {make_token(sub='8')}"}
    assert c.post(f"/actions/{aid}/confirm", json={"approve": True}, headers=h2).status_code == 400
    ok = c.post(f"/actions/{aid}/confirm", json={"approve": True}, headers=h)
    assert ok.status_code == 200 and proj.executed == [("cancelar", "7", 9)]
    assert c.delete("/me/data", headers=h).status_code == 204


def test_api_validation_and_rate_limit(settings):
    c, *_ = _client(settings)
    h = {"Authorization": f"Bearer {make_token()}"}
    assert c.post("/chat", json={"message": ""}, headers=h).status_code == 422
    codes = [c.post("/chat", json={"message": "hola"}, headers=h).status_code for _ in range(7)]
    assert codes[:5] == [200] * 5 and codes[5] == 429


# ------------------------------------------------------------------ Postgres real
@pytest.mark.skipif(not PG, reason="BOT_DATABASE_URL no definido")
async def test_postgres_store_end_to_end(settings):
    from bot_core.db import open_pool
    from bot_core.stores import PostgresStore
    pool = await open_pool(PG)
    try:
        store = PostgresStore(pool)
        proj = DemoProject()
        llm = FakeLLM([
            LLMResponse(tool_calls=[ToolCall("recordar_dato", {"clave": "turno_preferido", "valor": "tarde"})]),
            LLMResponse(text="anotado"),
            LLMResponse(tool_calls=[ToolCall("cancelar", {"id_cita": 5})]),
            LLMResponse(text="confirma"),
        ])
        settings.rate_limit_per_min = 100
        eng = BotEngine(settings, store, llm, proj)
        uid_ext = f"t{os.getpid()}"
        p = principal(uid_ext)

        r1 = await eng.chat(p, "prefiero la tarde")
        uid = await store.upsert_user("demo", uid_ext, "PACIENTE", "Ana")
        assert await store.get_facts(uid) == {"turno_preferido": "tarde"}

        r2 = await eng.chat(p, "cancela la 5", conversation_id=r1.conversation_id)
        assert r2.conversation_id == r1.conversation_id
        msgs = await store.recent_messages(r1.conversation_id, 10)
        assert [m.role for m in msgs] == ["user", "assistant", "user", "assistant"]

        aid = r2.pending_actions[0]["id"]
        assert await store.get_pending(aid, uid + 999) is None           # otro usuario
        out = await eng.resolve_action(p, aid, True)
        assert proj.executed[-1] == ("cancelar", uid_ext, 5)
        with pytest.raises(ValueError):
            await eng.resolve_action(p, aid, True)                        # no doble ejecucion

        # claim atomico: dos clics simultaneos -> solo uno gana
        aid2 = await store.create_pending(uid, r1.conversation_id, "cancelar", {"id_cita": 1}, "x")
        wins = await asyncio.gather(store.resolve_pending(aid2, "approved"), store.resolve_pending(aid2, "approved"))
        assert sorted(wins) == [False, True]

        async with pool.connection() as c:
            n = (await (await c.execute("select count(*) from bot.tool_audit where user_id=%s", (uid,))).fetchone())[0]
        assert n >= 3

        # resumen persistido
        await store.set_summary(r1.conversation_id, "resumen", msgs[1].id)
        conv = await store.get_conversation(r1.conversation_id)
        assert conv.summary == "resumen" and conv.summarized_upto == msgs[1].id
        assert [m.id for m in await store.recent_messages(r1.conversation_id, 10, after_id=conv.summarized_upto)][:2] == [msgs[2].id, msgs[3].id]

        # conversacion ajena / uuid invalido no revienta: crea una nueva
        other = await store.upsert_user("demo", uid_ext + "x", "PACIENTE", "B")
        c2 = await store.get_or_create_conversation(other, r1.conversation_id, "web")
        assert c2.id != r1.conversation_id
        c3 = await store.get_or_create_conversation(other, "no-es-uuid", "web")
        assert c3.id

        # olvidar
        await eng.forget(p)
        assert await store.get_conversation(r1.conversation_id) is None
        assert await store.get_facts(uid) == {}
        await store.forget_user(other)
    finally:
        await pool.close()
