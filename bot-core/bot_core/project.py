from __future__ import annotations
from .auth import Principal
from .tools import ToolRegistry


class Project:
    """Contrato que implementa cada proyecto (citas, asistente-pc, ...)."""

    id: str = "base"
    timezone: str = "America/Lima"
    # Datos que el bot puede recordar del usuario: clave -> descripcion para el modelo.
    fact_keys: dict[str, str] = {}
    # True => el motor NO deja pasar una respuesta con horas (HH:MM) que no salgan de una herramienta
    # (o del propio mensaje del usuario). Evita ofrecer horarios inventados.
    ground_times: bool = False

    def __init__(self) -> None:
        self.registry = ToolRegistry()

    def system_prompt(self) -> str:
        raise NotImplementedError

    async def load_context(self, principal: Principal) -> str:
        """Texto con datos frescos del usuario sacados del backend (proximas citas, etc.)."""
        return ""
