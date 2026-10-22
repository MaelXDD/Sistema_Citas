"""python -m bot_core.migrate   -> crea/actualiza el esquema 'bot' en BOT_DATABASE_URL."""
import asyncio
import os
from dotenv import load_dotenv
from .db import apply_schema

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(apply_schema(os.environ["BOT_DATABASE_URL"]))
    print("Esquema 'bot' listo.")
