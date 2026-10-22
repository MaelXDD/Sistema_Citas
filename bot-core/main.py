"""Arranque:  uvicorn main:app --port 8090

Elige el proyecto con BOT_PROJECT (carpeta projects/<nombre>/project.py con build(settings))."""
import importlib

from dotenv import load_dotenv

load_dotenv()

from bot_core.api import create_app   # noqa: E402
from bot_core.config import Settings  # noqa: E402

settings = Settings.from_env()
_mod = importlib.import_module(f"projects.{settings.project}.project")
_project, _on_close = _mod.build(settings)
app = create_app(settings, _project, on_close=_on_close)
