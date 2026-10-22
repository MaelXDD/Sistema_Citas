"""Validacion del JWT emitido por el backend del proyecto (HS256).

La identidad del usuario sale SIEMPRE de aqui, nunca del cuerpo de la peticion
ni de lo que diga el modelo.
"""
from __future__ import annotations
from dataclasses import dataclass
import jwt


class AuthError(Exception):
    pass


@dataclass(frozen=True)
class Principal:
    user_id: str          # id externo (id_paciente)
    role: str
    name: str
    token: str            # se reenvia al backend para que ELLOS apliquen permisos


def verify_token(token: str, secret: str, issuer: str | None = None, *,
                 role_claim: str = "rol", name_claim: str = "nombre", default_role: str = "PACIENTE") -> Principal:
    if not secret or len(secret) < 32:
        raise AuthError("BOT_JWT_SECRET no configurado (minimo 32 caracteres)")
    try:
        claims = jwt.decode(
            token, secret, algorithms=["HS256"],
            issuer=issuer or None,
            options={"require": ["sub", "exp"], "verify_iss": bool(issuer)},
        )
    except jwt.PyJWTError as e:
        raise AuthError(f"token invalido: {e}") from e
    return Principal(
        user_id=str(claims["sub"]),
        role=str(claims.get(role_claim, default_role)),
        name=str(claims.get(name_claim, "")),
        token=token,
    )
