import asyncio
import sys

# psycopg (async) no funciona con el ProactorEventLoop de Windows. Se fuerza el Selector aqui para que
# cualquier punto de entrada (python run.py, python -m bot_core.migrate, tests) funcione igual.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

"""bot_core: motor reutilizable de asistente (Gemini + memoria por usuario + tools)."""
from .config import Settings
from .project import Project
from .tools import ToolRegistry, ToolContext
from .engine import BotEngine, ChatReply

__all__ = ["Settings", "Project", "ToolRegistry", "ToolContext", "BotEngine", "ChatReply"]
