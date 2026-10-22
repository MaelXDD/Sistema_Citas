"""Plantilla para un proyecto nuevo: copia esta carpeta a projects/<nombre>/ y ajusta.

Un proyecto solo aporta: prompt, tools, contexto del usuario y (opcional) claves de preferencias.
Todo lo demas (Gemini, memoria, auditoria, confirmaciones, JWT, API) viene de bot_core.
"""
from bot_core.auth import Principal
from bot_core.config import Settings
from bot_core.project import Project
from bot_core.tools import ToolContext


class MiProyecto(Project):
    id = "mi-proyecto"
    timezone = "America/Lima"
    fact_keys = {"idioma_preferido": "idioma en que prefiere que le hablen"}

    def __init__(self):
        super().__init__()

        @self.registry.tool("Describe lo que hace la herramienta para el modelo.")
        async def ejemplo(ctx: ToolContext, texto: str) -> dict:
            return {"eco": texto, "usuario": ctx.user_id}       # ctx lo inyecta el codigo, no el modelo

        @self.registry.tool("Accion que modifica datos: pide confirmacion en pantalla.",
                            confirm=True, summary=lambda a: f"Hacer algo con {a['texto']}")
        async def accion_riesgosa(ctx: ToolContext, texto: str) -> dict:
            return {"mensaje": "Hecho"}

    def system_prompt(self) -> str:
        return "Eres el asistente de <mi proyecto>. ..."

    async def load_context(self, principal: Principal) -> str:
        return ""        # datos frescos del usuario desde tu backend


def build(settings: Settings):
    async def cerrar(): ...
    return MiProyecto(), cerrar
