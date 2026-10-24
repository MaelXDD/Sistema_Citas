# bot-core — chatbot IA reutilizable

Servicio FastAPI + Gemini. El **núcleo** (`bot_core/`) no sabe nada de citas: aporta JWT, memoria de
preferencias, auditoría, confirmación de acciones, límite de uso y la API.

## Arrancar
```bash
cd bot-core
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # rellena GEMINI_API_KEY, BOT_DATABASE_URL, BOT_JWT_SECRET
python -m bot_core.migrate  # crea el esquema "bot" (una vez)
uvicorn main:app --port 8090
"C:\Users\JHEINS\AppData\Local\Programs\Python\Python314\python.exe" run.py
```
Spring (puerto 8087) debe arrancar con la **misma** `BOT_JWT_SECRET` (≥ 32 caracteres).
Comprueba: `http://localhost:8090/health` → `{"status":"ok","project":"citas"}`.

Flujo: login Spring → devuelve `token` → el widget (`js/bot/bot-widget.js`) lo guarda en
`sessionStorage.botToken` → llama a `CONFIG.BOT_URL` (`/chat`) → el bot usa tools que llaman a
`/api/bot/**` de Spring reenviando ese mismo JWT.

## Tests
`pip install -r requirements.txt && pytest`
