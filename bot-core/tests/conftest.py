import sys, time
from pathlib import Path
import jwt, pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bot_core.auth import Principal
from bot_core.config import Settings
from bot_core.engine import BotEngine
from bot_core.llm import LLMResponse, ToolCall
from bot_core.project import Project
from bot_core.stores import InMemoryStore
from bot_core.tools import ToolContext, ToolError

SECRET = "x" * 40


class FakeLLM:
    """Guion: lista de LLMResponse que va devolviendo; guarda lo que recibio."""
    def __init__(self, script=None):
        self.script = list(script or [])
        self.calls = []
        self.summary = "resumen falso"

    async def generate(self, *, system, messages, tools):
        self.calls.append({"system": system, "messages": list(messages), "tools": tools})
        return self.script.pop(0) if self.script else LLMResponse(text="ok")

    async def complete(self, *, system, prompt):
        return self.summary


class DemoProject(Project):
    id = "demo"
    fact_keys = {"turno_preferido": "mañana/tarde"}

    def __init__(self):
        super().__init__()
        self.executed = []

        @self.registry.tool("Devuelve datos del usuario")
        async def mis_datos(ctx: ToolContext) -> dict:
            self.executed.append(("mis_datos", ctx.user_id))
            return {"user": ctx.user_id}

        @self.registry.tool("Cancela una cita", confirm=True, summary=lambda a: f"Cancelar {a['id_cita']}")
        async def cancelar(ctx: ToolContext, id_cita: int) -> dict:
            self.executed.append(("cancelar", ctx.user_id, id_cita))
            return {"mensaje": "cancelada"}

        @self.registry.tool("Solo admin", roles=["ADMIN"])
        async def borrar_todo(ctx: ToolContext) -> dict:
            self.executed.append(("borrar_todo",))
            return {}

        @self.registry.tool("Falla")
        async def rota(ctx: ToolContext) -> dict:
            raise ToolError("backend caido")

        @self.registry.tool("UI")
        async def preparar(ctx: ToolContext) -> dict:
            return {"estado": "ok", "_ui": {"type": "open_checkout"}}

    def system_prompt(self):
        return "Eres un bot de prueba."


def principal(uid="1", role="PACIENTE"):
    return Principal(user_id=uid, role=role, name="Ana", token="tok")


@pytest.fixture
def settings():
    return Settings(jwt_secret=SECRET, jwt_issuer="citas-api", history_messages=6, rate_limit_per_min=5)


@pytest.fixture
def make(settings):
    def _make(script=None, **over):
        for k, v in over.items():
            setattr(settings, k, v)
        proj, store, llm = DemoProject(), InMemoryStore(), FakeLLM(script)
        return BotEngine(settings, store, llm, proj), proj, store, llm
    return _make


def make_token(sub="7", secret=SECRET, exp_in=3600, iss="citas-api", **extra):
    return jwt.encode({"sub": sub, "exp": int(time.time()) + exp_in, "iss": iss, **extra}, secret, algorithm="HS256")
