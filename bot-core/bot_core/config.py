from __future__ import annotations
import os
from dataclasses import dataclass, field


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


@dataclass
class Settings:
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    gemini_fallback_models: list[str] = field(default_factory=list)   # se prueban si el principal falla/está saturado
    database_url: str = ""
    jwt_secret: str = ""
    jwt_issuer: str = ""
    jwt_role_claim: str = "rol"       # nombre del claim con el rol en el JWT de TU backend
    jwt_name_claim: str = "nombre"    # nombre del claim con el nombre visible
    jwt_default_role: str = "PACIENTE"
    project: str = "citas"
    rate_limit_per_min: int = 12
    history_messages: int = 16
    cors_origins: list[str] = field(default_factory=list)
    max_tool_rounds: int = 5
    max_user_chars: int = 1500

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
            gemini_model=os.getenv("GEMINI_MODEL", "gemini-flash-latest"),
            gemini_fallback_models=[m.strip() for m in os.getenv("GEMINI_FALLBACK_MODELS", "").split(",") if m.strip()],
            database_url=os.getenv("BOT_DATABASE_URL", ""),
            jwt_secret=os.getenv("BOT_JWT_SECRET", ""),
            jwt_issuer=os.getenv("BOT_JWT_ISSUER", ""),
            jwt_role_claim=os.getenv("BOT_JWT_ROLE_CLAIM", "rol"),
            jwt_name_claim=os.getenv("BOT_JWT_NAME_CLAIM", "nombre"),
            jwt_default_role=os.getenv("BOT_JWT_DEFAULT_ROLE", "PACIENTE"),
            project=os.getenv("BOT_PROJECT", "citas"),
            rate_limit_per_min=_int("BOT_RATE_LIMIT_PER_MIN", 12),
            history_messages=_int("BOT_HISTORY_MESSAGES", 16),
            cors_origins=[o.strip() for o in os.getenv("BOT_CORS_ORIGINS", "").split(",") if o.strip()],
        )
