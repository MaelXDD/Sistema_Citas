# bot-core — chatbot IA reutilizable

Servicio FastAPI + Gemini. El **núcleo** (`bot_core/`) no sabe nada de citas: aporta JWT, memoria de
preferencias, auditoría, confirmación de acciones, límite de uso y la API. Cada proyecto aporta solo
una carpeta en `projects/<nombre>/`.

## Arrancar (este proyecto)
```bash
cd bot-core
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # rellena GEMINI_API_KEY, BOT_DATABASE_URL, BOT_JWT_SECRET
python -m bot_core.migrate  # crea el esquema "bot" (una vez)
uvicorn main:app --port 8090
```
Spring (puerto 8087) debe arrancar con la **misma** `BOT_JWT_SECRET` (≥ 32 caracteres).
Comprueba: `http://localhost:8090/health` → `{"status":"ok","project":"citas"}`.

Flujo: login Spring → devuelve `token` → el widget (`js/bot/bot-widget.js`) lo guarda en
`sessionStorage.botToken` → llama a `CONFIG.BOT_URL` (`/chat`) → el bot usa tools que llaman a
`/api/bot/**` de Spring reenviando ese mismo JWT.

## Reutilizarlo en otro proyecto
1. Copia `bot-core/` entero (o publícalo como repo propio).
2. `cp -r projects/_template projects/mi_proyecto` y edita `project.py`:
   prompt, `fact_keys`, `load_context()` y tus tools con `@self.registry.tool(...)`
   (`confirm=True` para acciones que modifican datos).
3. `.env`: `BOT_PROJECT=mi_proyecto` y, si tu JWT usa otros nombres, `BOT_JWT_ROLE_CLAIM` / `BOT_JWT_NAME_CLAIM`.
4. Tu backend debe emitir un JWT HS256 con `sub`, `exp` (y `iss` si configuras `BOT_JWT_ISSUER`).
5. En el front incluye `bot-widget.js` + `bot.css` y apunta `BOT_URL` al servicio.
La BD es la misma Supabase, pero el bot usa su propio schema `bot` (no se mezcla con `public`). Varios proyectos pueden compartirlo: se separan por `project_id`.

## Tests
`pip install -r requirements.txt && pytest`
