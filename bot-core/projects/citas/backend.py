"""Cliente HTTP hacia la API Spring del sistema de citas (solo rutas /api/bot/**).

Reenvia el JWT del usuario: Spring es quien decide que puede ver o hacer cada paciente.
"""
from __future__ import annotations
import httpx
from bot_core.tools import ToolError


class CitasBackend:
    def __init__(self, base_url: str, timeout: float = 10.0):
        self.http = httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=timeout)

    async def aclose(self) -> None:
        await self.http.aclose()

    async def _req(self, method: str, path: str, token: str, **kw):
        try:
            r = await self.http.request(method, path, headers={"Authorization": f"Bearer {token}"}, **kw)
        except httpx.HTTPError as e:
            raise ToolError("El sistema de citas no responde ahora mismo.") from e
        if r.status_code in (401, 403):
            raise ToolError("Tu sesión expiró. Inicia sesión de nuevo.")
        if r.status_code >= 400:
            msg = ""
            try:
                msg = r.json().get("mensaje", "")
            except Exception:                       # noqa: BLE001
                pass
            raise ToolError(msg or "El sistema rechazó la solicitud.")
        return r.json() if r.content else {}

    async def get(self, path: str, token: str, **params):
        return await self._req("GET", path, token, params={k: v for k, v in params.items() if v is not None})

    async def post(self, path: str, token: str, json: dict):
        return await self._req("POST", path, token, json=json)

    async def delete(self, path: str, token: str):
        return await self._req("DELETE", path, token)
