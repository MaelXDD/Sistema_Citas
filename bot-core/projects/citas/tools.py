from __future__ import annotations

from typing import Annotated, Optional

from bot_core.tools import ToolContext, ToolRegistry

from .backend import CitasBackend

Fecha = Annotated[str, "Fecha en formato AAAA-MM-DD"]


def register(reg: ToolRegistry, api: CitasBackend) -> None:
    # ----------------------------------------------------------------- consulta
    @reg.tool("Lista las especialidades activas con el precio de la consulta.")
    async def listar_especialidades(ctx: ToolContext) -> dict:
        return {"especialidades": await api.get("/api/bot/catalogo", ctx.token)}

    @reg.tool("Lista los doctores activos de una especialidad (usa el id_especialidad de listar_especialidades) "
              "con los días y horarios de atención.")
    async def doctores_por_especialidad(ctx: ToolContext, id_especialidad: int) -> dict:
        return {"doctores": await api.get("/api/bot/doctores", ctx.token, idEspecialidad=id_especialidad)}

    @reg.tool("Devuelve las horas libres (bloques de 30 min) de un doctor en una fecha concreta. "
              "Consúltala siempre antes de proponer horas.")
    async def horas_disponibles(ctx: ToolContext, id_doctor: int, fecha: Fecha) -> dict:
        return await api.get("/api/bot/disponibilidad", ctx.token, idDoctor=id_doctor, fecha=fecha)

    @reg.tool("Lista las citas del paciente en sesión (próximas e historial reciente) con su estado y pago.")
    async def mis_citas(ctx: ToolContext) -> dict:
        return {"citas": await api.get("/api/bot/mis-citas", ctx.token)}

    # ----------------------------------------------------------------- reservar
    @reg.tool("Valida un horario y prepara la reserva. NO crea la cita: muestra al paciente un botón para ir a pagar, "
              "y la cita se registra al completar el pago. Úsala cuando el paciente ya eligió doctor, fecha y hora.")
    async def preparar_reserva(ctx: ToolContext, id_doctor: int, fecha: Fecha,
                               hora: Annotated[str, "Hora HH:MM en 24 h"],
                               motivo: Optional[str] = None) -> dict:
        data = await api.post("/api/bot/reservas/validar", ctx.token, {
            "idDoctor": id_doctor, "fecha": fecha, "hora": hora, "motivo": (motivo or "Consulta general")[:300]})
        return {
            "estado": "listo_para_pagar",
            "resumen": data["resumen"],
            "_ui": {"type": "open_checkout", "label": "Ir a pagar", "citaPendiente": data["citaPendiente"]},
        }

    # ----------------------------------------------------------------- cancelar
    @reg.tool("Cancela una cita del paciente en sesión. Requiere confirmación en pantalla.",
              confirm=True,
              summary=lambda a: f"Cancelar la cita n.º {a['id_cita']}",
              success_message=lambda r: r.get("mensaje", "Tu cita fue cancelada."))
    async def cancelar_cita(ctx: ToolContext, id_cita: int) -> dict:
        return await api.delete(f"/api/bot/citas/{id_cita}", ctx.token)
