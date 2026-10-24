from __future__ import annotations

import os
from pathlib import Path

from bot_core.auth import Principal
from bot_core.config import Settings
from bot_core.project import Project

from .backend import CitasBackend
from .tools import register


class CitasProject(Project):
    id = "citas"
    timezone = "America/Lima"
    ground_times = True      # nunca ofrecer horas que no hayan salido de horas_disponibles
    fact_keys = {
        "turno_preferido": "mañana, tarde o noche",
        "especialidad_habitual": "especialidad que suele reservar",
        "doctor_preferido": "nombre del doctor que prefiere",
        "recordatorio": "cómo prefiere que le avisen: correo, teléfono",
    }

    def __init__(self, api: CitasBackend):
        super().__init__()
        self.api = api
        register(self.registry, api)

    def system_prompt(self) -> str:
        return (Path(__file__).with_name("prompt.md")).read_text(encoding="utf-8")

    async def load_context(self, principal: Principal) -> str:
        """Datos frescos del paciente (derivados de citas/pagos): nada se duplica en la BD del bot."""
        data = await self.api.get("/api/bot/contexto", principal.token)
        lines = []
        if data.get("proximaCita"):
            lines.append(f"Próxima cita: {data['proximaCita']}")
        if data.get("especialidadFrecuente"):
            lines.append(f"Especialidad más frecuente: {data['especialidadFrecuente']}")
        if data.get("doctorFrecuente"):
            lines.append(f"Doctor más frecuente: {data['doctorFrecuente']}")
        lines.append(f"Citas atendidas: {data.get('citasAtendidas', 0)}; canceladas: {data.get('citasCanceladas', 0)}")
        if data.get("pagosPendientes"):
            lines.append(f"Pagos pendientes: {data['pagosPendientes']}")
        return "\n".join(lines)


def build(settings: Settings):
    api = CitasBackend(os.getenv("CITAS_API_URL", "http://localhost:8087"))
    return CitasProject(api), api.aclose
