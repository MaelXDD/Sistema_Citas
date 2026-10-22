from __future__ import annotations
from pathlib import Path


async def open_pool(database_url: str):
    from psycopg_pool import AsyncConnectionPool
    pool = AsyncConnectionPool(database_url, min_size=1, max_size=5, open=False,
                               kwargs={"autocommit": True, "prepare_threshold": None})  # pooler de Supabase (modo transaccion): sin prepared statements
    await pool.open(wait=True, timeout=20)   # falla en voz alta si no conecta (credenciales, red, URL)
    return pool


async def apply_schema(database_url: str) -> None:
    import psycopg
    sql = (Path(__file__).resolve().parent.parent / "sql" / "001_schema.sql").read_text(encoding="utf-8")
    async with await psycopg.AsyncConnection.connect(database_url, autocommit=True) as conn:
        await conn.execute(sql)
