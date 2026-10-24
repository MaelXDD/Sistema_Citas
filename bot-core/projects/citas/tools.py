from __future__ import annotations

import re
import unicodedata
from typing import Annotated, Optional

from bot_core.tools import ToolContext, ToolError, ToolRegistry

from .backend import CitasBackend

Fecha = Annotated[str, "Fecha en formato AAAA-MM-DD"]

_TITULOS = {"dr", "dra", "doctor", "doctora"}


def _tokens(texto: str) -> set[str]:
    """Palabras del nombre sin tildes, mayúsculas ni títulos (Dr., Dra.)."""
    s = unicodedata.normalize("NFD", (texto or "").lower())
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return {t for t in re.findall(r"[a-z]+", s) if t not in _TITULOS}


def _mismo_doctor(dicho: str, real: str) -> bool:
    """True si TODAS las palabras del nombre dicho están en el nombre real (basta con el apellido)."""
    a = _tokens(dicho)
    return bool(a) and a <= _tokens(real)


# ---------------------------------------------------------------- resúmenes que se recuerdan entre turnos
def _nota_catalogo(args: dict, r: dict) -> str:
    items = [f"id {e['idEspecialidad']}={e['nombre']}" + (f" (S/ {e['precioSoles']})" if e.get("precioSoles") is not None else "")
             for e in r.get("especialidades", [])]
    return "listar_especialidades -> " + "; ".join(items)


def _nota_doctores(args: dict, r: dict) -> str:
    docs = []
    for d in r.get("doctores", []):
        turnos = ", ".join(f"{h['dia']} {h['desde']}-{h['hasta']}" for h in d.get("horarios", [])) or "sin horarios"
        docs.append(f"id_doctor {d['idDoctor']}={d['nombre']} ({d.get('especialidad', '')}; horario general de atención, "
                    f"NO son horas libres: {turnos})")
    return f"doctores_por_especialidad(id_especialidad={args.get('id_especialidad')}) -> " + " | ".join(docs)


def _nota_horas(args: dict, r: dict) -> str:
    base = (f"horas_disponibles(id_doctor={r.get('idDoctor')}={r.get('doctor')}, {r.get('fecha')} {r.get('dia')}) -> "
            f"libres: {', '.join(r.get('horasLibres', [])) or 'ninguna'}")
    if r.get("motivoSinHoras"):
        base += f" | motivo: {r['motivoSinHoras']}"
    otras = [f"{f['fecha']} ({f['dia']}): {', '.join(f['horasLibres'][:4])}" for f in r.get("proximasFechasConHoras", [])]
    if otras:
        base += " | otras fechas con horas: " + "; ".join(otras)
    return base


def _nota_citas(args: dict, r: dict) -> str:
    citas = [f"cita n.º {c['idCita']} {c['fecha']} {c['hora']} {c['doctor']} ({c['especialidad']}) {c['estado']}"
             for c in r.get("citas", [])]
    return "mis_citas -> " + ("; ".join(citas) or "sin citas")


def _nota_reserva(args: dict, r: dict) -> str:
    return f"preparar_reserva -> reserva lista para pagar: {r.get('resumen')}"


def register(reg: ToolRegistry, api: CitasBackend) -> None:
    # ----------------------------------------------------------------- consulta
    @reg.tool("Lista las especialidades activas con el precio de la consulta.", note=_nota_catalogo)
    async def listar_especialidades(ctx: ToolContext) -> dict:
        return {"especialidades": await api.get("/api/bot/catalogo", ctx.token)}

    @reg.tool("Lista los doctores activos de una especialidad (usa el id_especialidad de listar_especialidades) "
              "con sus días y horario GENERAL de atención. Ese horario NO indica qué horas están libres: "
              "para proponer horas usa siempre horas_disponibles.", note=_nota_doctores)
    async def doctores_por_especialidad(ctx: ToolContext, id_especialidad: int) -> dict:
        return {"doctores": await api.get("/api/bot/doctores", ctx.token, idEspecialidad=id_especialidad)}

    @reg.tool("Devuelve las horas libres (bloques de 30 min) de un doctor en una fecha concreta. "
              "Si no hay horas, incluye 'motivoSinHoras' (el doctor no atiende ese día / todo reservado / ya pasó) y "
              "'proximasFechasConHoras' con otras fechas disponibles. Consúltala siempre antes de proponer horas.",
              note=_nota_horas)
    async def horas_disponibles(ctx: ToolContext, id_doctor: int, fecha: Fecha) -> dict:
        return await api.get("/api/bot/disponibilidad", ctx.token, idDoctor=id_doctor, fecha=fecha)

    @reg.tool("Lista las citas del paciente en sesión (próximas e historial reciente) con su estado y pago.",
              note=_nota_citas)
    async def mis_citas(ctx: ToolContext) -> dict:
        return {"citas": await api.get("/api/bot/mis-citas", ctx.token)}

    # ----------------------------------------------------------------- reservar
    @reg.tool("Valida un horario y prepara la reserva. NO crea la cita: muestra al paciente un botón para ir a pagar, "
              "y la cita se registra al completar el pago. Úsala cuando el paciente ya eligió doctor, fecha y hora. "
              "Pasa el id_doctor Y el nombre del doctor elegido (se verifica que coincidan).", note=_nota_reserva)
    async def preparar_reserva(ctx: ToolContext, id_doctor: int, nombre_doctor: str, fecha: Fecha,
                               hora: Annotated[str, "Hora HH:MM en 24 h"],
                               motivo: Optional[str] = None) -> dict:
        # 1) El id debe corresponder al doctor que el paciente eligió (evita mezclar ids y nombres).
        disp = await api.get("/api/bot/disponibilidad", ctx.token, idDoctor=id_doctor, fecha=fecha)
        if not _mismo_doctor(nombre_doctor, disp.get("doctor", "")):
            raise ToolError(
                f"El id_doctor {id_doctor} corresponde a {disp.get('doctor')}, no a '{nombre_doctor}'. "
                "Revisa los ids de la última lista de doctores y vuelve a intentarlo con el id correcto.")
        # 2) Validación real del horario en el sistema de citas.
        data = await api.post("/api/bot/reservas/validar", ctx.token, {
            "idDoctor": id_doctor, "fecha": fecha, "hora": hora, "motivo": (motivo or "Consulta general")[:300]})
        return {
            "estado": "listo_para_pagar",
            "resumen": data["resumen"],
            # La tarjeta del widget muestra este resumen (datos del sistema, no lo que diga el modelo).
            "_ui": {"type": "open_checkout", "label": "Ir a pagar", "resumen": data["resumen"],
                    "citaPendiente": data["citaPendiente"]},
        }

    # ----------------------------------------------------------------- cancelar
    @reg.tool("Cancela una cita del paciente en sesión. Requiere confirmación en pantalla.",
              confirm=True,
              summary=lambda a: f"Cancelar la cita n.º {a['id_cita']}",
              success_message=lambda r: r.get("mensaje", "Tu cita fue cancelada."))
    async def cancelar_cita(ctx: ToolContext, id_cita: int) -> dict:
        return await api.delete(f"/api/bot/citas/{id_cita}", ctx.token)
