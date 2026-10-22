from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .auth import AuthError, Principal, verify_token
from .config import Settings
from .engine import BotEngine, RateLimited
from .llm import LLM
from .project import Project
from .stores import Store


log = logging.getLogger("uvicorn.error")


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[str] = None
    channel: str = "web"


class ConfirmIn(BaseModel):
    approve: bool


def create_app(settings: Settings, project: Project, store: Store | None = None, llm: LLM | None = None,
               on_close=None) -> FastAPI:
    """Fabrica de la API. `store`/`llm` se inyectan en tests; en produccion se crean en el arranque."""
    state: dict = {}

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if "engine" not in state:
            from .db import open_pool
            from .llm import GeminiLLM
            from .stores import PostgresStore
            pool = await open_pool(settings.database_url)
            state["engine"] = BotEngine(settings, PostgresStore(pool),
                                        GeminiLLM(settings.gemini_api_key, settings.gemini_model,
                                                settings.gemini_fallback_models), project)
            state["pool"] = pool
        yield
        if "pool" in state:
            await state["pool"].close()
        if on_close:
            await on_close()

    app = FastAPI(title=f"bot-core / {project.id}", lifespan=lifespan)
    if store is not None and llm is not None:
        state["engine"] = BotEngine(settings, store, llm, project)
    if settings.cors_origins:
        app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                           allow_methods=["GET", "POST", "DELETE"], allow_headers=["Authorization", "Content-Type"])

    def principal(authorization: str | None = Header(default=None)) -> Principal:
        if not authorization or not authorization.lower().startswith("bearer "):
            log.warning("401 en el bot: falta el header Authorization")
            raise HTTPException(401, "Falta el token de sesión")
        try:
            return verify_token(authorization[7:].strip(), settings.jwt_secret, settings.jwt_issuer,
                                role_claim=settings.jwt_role_claim, name_claim=settings.jwt_name_claim,
                                default_role=settings.jwt_default_role)
        except AuthError as e:
            log.warning("401 en el bot: %s", e)      # el motivo real (nunca incluye el secreto)
            raise HTTPException(401, "Sesión inválida o expirada")

    @app.get("/health")
    async def health():
        return {"status": "ok", "project": project.id}

    @app.post("/chat")
    async def chat(body: ChatIn, p: Principal = Depends(principal)):
        try:
            reply = await state["engine"].chat(p, body.message, body.conversation_id, body.channel)
        except RateLimited:
            raise HTTPException(429, "Demasiados mensajes. Espera un momento.")
        except ValueError as e:
            raise HTTPException(400, str(e))
        return reply.to_dict()

    @app.post("/actions/{action_id}/confirm")
    async def confirm(action_id: str, body: ConfirmIn, p: Principal = Depends(principal)):
        try:
            return (await state["engine"].resolve_action(p, action_id, body.approve)).to_dict()
        except ValueError as e:
            raise HTTPException(400, str(e))

    @app.get("/me/facts")
    async def my_facts(p: Principal = Depends(principal)):
        eng: BotEngine = state["engine"]
        uid = await eng.store.upsert_user(project.id, p.user_id, p.role, p.name)
        return await eng.store.get_facts(uid)

    @app.delete("/me/data", status_code=204)
    async def forget_me(p: Principal = Depends(principal)):
        await state["engine"].forget(p)

    return app
