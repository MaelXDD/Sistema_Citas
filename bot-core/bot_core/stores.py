"""Persistencia: contrato `Store` + implementacion Postgres (Supabase) + implementacion en memoria (tests)."""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol


@dataclass
class Conversation:
    id: str
    summary: str | None = None
    summarized_upto: int = 0


@dataclass
class Msg:
    id: int
    role: str
    content: str


@dataclass
class Pending:
    id: str
    tool: str
    args: dict
    summary: str
    conversation_id: str | None


class Store(Protocol):
    async def upsert_user(self, project_id: str, external_id: str, role: str, name: str) -> int: ...
    async def get_or_create_conversation(self, bot_user_id: int, conversation_id: str | None, channel: str) -> Conversation: ...
    async def get_conversation(self, conversation_id: str) -> Conversation | None: ...
    async def add_message(self, conversation_id: str, role: str, content: str) -> int: ...
    async def recent_messages(self, conversation_id: str, limit: int, after_id: int = 0) -> list[Msg]: ...
    async def recent_tool_notes(self, conversation_id: str, limit: int, after_id: int = 0) -> list[Msg]: ...
    async def count_after(self, conversation_id: str, after_id: int) -> int: ...
    async def messages_to_summarize(self, conversation_id: str, after_id: int, keep_last: int) -> list[Msg]: ...
    async def set_summary(self, conversation_id: str, summary: str, upto_id: int) -> None: ...
    async def get_facts(self, bot_user_id: int) -> dict[str, str]: ...
    async def set_fact(self, bot_user_id: int, key: str, value: str, source: str = "bot", ttl_days: int | None = None) -> None: ...
    async def delete_fact(self, bot_user_id: int, key: str) -> bool: ...
    async def audit(self, bot_user_id: int | None, conversation_id: str | None, tool: str, args: Any, result: Any, status: str) -> None: ...
    async def create_pending(self, bot_user_id: int, conversation_id: str | None, tool: str, args: dict, summary: str, ttl_min: int = 10) -> str: ...
    async def get_pending(self, action_id: str, bot_user_id: int) -> Pending | None: ...
    async def resolve_pending(self, action_id: str, outcome: str) -> bool: ...
    async def forget_user(self, bot_user_id: int) -> None: ...


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ----------------------------------------------------------------------------
class InMemoryStore:
    """Para pruebas y demos locales. No persiste nada."""

    def __init__(self) -> None:
        self.users: dict[tuple[str, str], int] = {}
        self.convs: dict[str, dict] = {}
        self.msgs: dict[str, list[Msg]] = {}
        self.facts: dict[int, dict[str, tuple[str, datetime | None]]] = {}
        self.audits: list[dict] = []
        self.pendings: dict[str, dict] = {}
        self._mid = 0

    async def upsert_user(self, project_id, external_id, role, name):
        return self.users.setdefault((project_id, external_id), len(self.users) + 1)

    async def get_or_create_conversation(self, bot_user_id, conversation_id, channel):
        c = self.convs.get(conversation_id or "")
        if not c or c["user"] != bot_user_id:
            cid = str(uuid.uuid4())
            c = self.convs[cid] = {"id": cid, "user": bot_user_id, "summary": None, "upto": 0}
            self.msgs[cid] = []
        return Conversation(c["id"], c["summary"], c["upto"])

    async def get_conversation(self, conversation_id):
        c = self.convs.get(conversation_id)
        return Conversation(c["id"], c["summary"], c["upto"]) if c else None

    async def add_message(self, conversation_id, role, content):
        self._mid += 1
        self.msgs[conversation_id].append(Msg(self._mid, role, content))
        return self._mid

    async def recent_messages(self, conversation_id, limit, after_id=0):
        rows = [m for m in self.msgs[conversation_id] if m.id > after_id and m.role in ("user", "assistant")]
        return rows[-limit:]

    async def recent_tool_notes(self, conversation_id, limit, after_id=0):
        rows = [m for m in self.msgs[conversation_id] if m.id > after_id and m.role == "tool"]
        return rows[-limit:]

    async def count_after(self, conversation_id, after_id):
        return len([m for m in self.msgs[conversation_id] if m.id > after_id and m.role in ("user", "assistant")])

    async def messages_to_summarize(self, conversation_id, after_id, keep_last):
        rows = [m for m in self.msgs[conversation_id] if m.id > after_id and m.role in ("user", "assistant")]
        return rows[:-keep_last] if keep_last else rows

    async def set_summary(self, conversation_id, summary, upto_id):
        self.convs[conversation_id].update(summary=summary, upto=upto_id)

    async def get_facts(self, bot_user_id):
        now = _now()
        return {k: v for k, (v, exp) in self.facts.get(bot_user_id, {}).items() if exp is None or exp > now}

    async def set_fact(self, bot_user_id, key, value, source="bot", ttl_days=None):
        exp = _now() + timedelta(days=ttl_days) if ttl_days else None
        self.facts.setdefault(bot_user_id, {})[key] = (value, exp)

    async def delete_fact(self, bot_user_id, key):
        return self.facts.get(bot_user_id, {}).pop(key, None) is not None

    async def audit(self, bot_user_id, conversation_id, tool, args, result, status):
        self.audits.append(dict(user=bot_user_id, tool=tool, args=args, result=result, status=status))

    async def create_pending(self, bot_user_id, conversation_id, tool, args, summary, ttl_min=10):
        aid = str(uuid.uuid4())
        self.pendings[aid] = dict(user=bot_user_id, conv=conversation_id, tool=tool, args=args,
                                  summary=summary, exp=_now() + timedelta(minutes=ttl_min), outcome=None)
        return aid

    async def get_pending(self, action_id, bot_user_id):
        p = self.pendings.get(action_id)
        if not p or p["user"] != bot_user_id or p["outcome"] or p["exp"] < _now():
            return None
        return Pending(action_id, p["tool"], p["args"], p["summary"], p["conv"])

    async def resolve_pending(self, action_id, outcome):
        p = self.pendings.get(action_id)
        if not p or p["outcome"]:
            return False
        p["outcome"] = outcome
        return True

    async def forget_user(self, bot_user_id):
        for cid in [c for c, v in self.convs.items() if v["user"] == bot_user_id]:
            self.convs.pop(cid); self.msgs.pop(cid, None)
        self.facts.pop(bot_user_id, None)
        for aid in [a for a, p in self.pendings.items() if p["user"] == bot_user_id]:
            self.pendings.pop(aid)
        self.audits = [a for a in self.audits if a["user"] != bot_user_id]


# ----------------------------------------------------------------------------
class PostgresStore:
    """Implementacion para Supabase/Postgres con psycopg3 (pool asincrono)."""

    def __init__(self, pool: Any):
        self.pool = pool

    async def _one(self, sql: str, params: tuple = ()) -> Any:
        async with self.pool.connection() as c:
            cur = await c.execute(sql, params)
            return await cur.fetchone()

    async def _all(self, sql: str, params: tuple = ()) -> list:
        async with self.pool.connection() as c:
            cur = await c.execute(sql, params)
            return await cur.fetchall()

    async def _run(self, sql: str, params: tuple = ()) -> None:
        async with self.pool.connection() as c:
            await c.execute(sql, params)

    async def upsert_user(self, project_id, external_id, role, name):
        row = await self._one(
            """insert into bot.users(project_id, external_user_id, role, display_name)
               values (%s,%s,%s,%s)
               on conflict (project_id, external_user_id)
               do update set role = excluded.role, display_name = coalesce(nullif(excluded.display_name,''), bot.users.display_name)
               returning id""", (project_id, external_id, role, name))
        return row[0]

    async def get_or_create_conversation(self, bot_user_id, conversation_id, channel):
        row = None
        if conversation_id:
            try:
                row = await self._one(
                    "select id::text, summary, summarized_upto from bot.conversations where id=%s and user_id=%s",
                    (conversation_id, bot_user_id))
            except Exception:           # uuid malformado
                row = None
        if row is None:
            row = await self._one(
                "insert into bot.conversations(user_id, channel) values (%s,%s) returning id::text, summary, summarized_upto",
                (bot_user_id, channel))
        else:
            await self._run("update bot.conversations set last_at=now() where id=%s", (row[0],))
        return Conversation(row[0], row[1], row[2])

    async def get_conversation(self, conversation_id):
        row = await self._one("select id::text, summary, summarized_upto from bot.conversations where id=%s", (conversation_id,))
        return Conversation(row[0], row[1], row[2]) if row else None

    async def add_message(self, conversation_id, role, content):
        row = await self._one(
            "insert into bot.messages(conversation_id, role, content) values (%s,%s,%s) returning id",
            (conversation_id, role, content))
        return row[0]

    async def recent_messages(self, conversation_id, limit, after_id=0):
        rows = await self._all(
            """select id, role, content from bot.messages
               where conversation_id=%s and id>%s and role in ('user','assistant')
               order by id desc limit %s""", (conversation_id, after_id, limit))
        return [Msg(r[0], r[1], r[2] or "") for r in reversed(rows)]

    async def recent_tool_notes(self, conversation_id, limit, after_id=0):
        rows = await self._all(
            """select id, role, content from bot.messages
               where conversation_id=%s and id>%s and role='tool'
               order by id desc limit %s""", (conversation_id, after_id, limit))
        return [Msg(r[0], r[1], r[2] or "") for r in reversed(rows)]

    async def count_after(self, conversation_id, after_id):
        return (await self._one(
            "select count(*) from bot.messages where conversation_id=%s and id>%s and role in ('user','assistant')",
            (conversation_id, after_id)))[0]

    async def messages_to_summarize(self, conversation_id, after_id, keep_last):
        rows = await self._all(
            """select id, role, content from bot.messages
               where conversation_id=%s and id>%s and role in ('user','assistant')
               order by id asc""", (conversation_id, after_id))
        msgs = [Msg(r[0], r[1], r[2] or "") for r in rows]
        return msgs[:-keep_last] if keep_last else msgs

    async def set_summary(self, conversation_id, summary, upto_id):
        await self._run("update bot.conversations set summary=%s, summarized_upto=%s where id=%s",
                        (summary, upto_id, conversation_id))

    async def get_facts(self, bot_user_id):
        rows = await self._all(
            "select key, value from bot.user_facts where user_id=%s and (expires_at is null or expires_at>now())",
            (bot_user_id,))
        return {k: v for k, v in rows}

    async def set_fact(self, bot_user_id, key, value, source="bot", ttl_days=None):
        await self._run(
            """insert into bot.user_facts(user_id,key,value,source,expires_at)
               values (%s,%s,%s,%s, case when %s::int is null then null else now() + (%s::int * interval '1 day') end)
               on conflict (user_id,key) do update
               set value=excluded.value, source=excluded.source, updated_at=now(), expires_at=excluded.expires_at""",
            (bot_user_id, key, value, source, ttl_days, ttl_days))

    async def delete_fact(self, bot_user_id, key):
        async with self.pool.connection() as c:
            cur = await c.execute("delete from bot.user_facts where user_id=%s and key=%s", (bot_user_id, key))
            return cur.rowcount > 0

    async def audit(self, bot_user_id, conversation_id, tool, args, result, status):
        await self._run(
            "insert into bot.tool_audit(user_id, conversation_id, tool, args, result, status) values (%s,%s,%s,%s,%s,%s)",
            (bot_user_id, conversation_id, tool, json.dumps(args, default=str), json.dumps(result, default=str), status))

    async def create_pending(self, bot_user_id, conversation_id, tool, args, summary, ttl_min=10):
        row = await self._one(
            """insert into bot.pending_actions(user_id, conversation_id, tool, args, summary, expires_at)
               values (%s,%s,%s,%s,%s, now() + (%s * interval '1 minute')) returning id::text""",
            (bot_user_id, conversation_id, tool, json.dumps(args), summary, ttl_min))
        return row[0]

    async def get_pending(self, action_id, bot_user_id):
        try:
            row = await self._one(
                """select id::text, tool, args, summary, conversation_id::text from bot.pending_actions
                   where id=%s and user_id=%s and resolved_at is null and expires_at>now()""",
                (action_id, bot_user_id))
        except Exception:
            return None
        if not row:
            return None
        args = row[2] if isinstance(row[2], dict) else json.loads(row[2])
        return Pending(row[0], row[1], args, row[3], row[4])

    async def resolve_pending(self, action_id, outcome):
        # "claim" atomico: solo uno de dos clics simultaneos obtiene la fila
        row = await self._one(
            "update bot.pending_actions set resolved_at=now(), outcome=%s where id=%s and resolved_at is null returning id",
            (outcome, action_id))
        return row is not None

    async def forget_user(self, bot_user_id):
        # conversations/messages/facts/pending caen en cascada; la auditoria se anonimiza por set null
        await self._run("delete from bot.conversations where user_id=%s", (bot_user_id,))
        await self._run("delete from bot.user_facts where user_id=%s", (bot_user_id,))
        await self._run("delete from bot.pending_actions where user_id=%s", (bot_user_id,))
        await self._run("delete from bot.tool_audit where user_id=%s", (bot_user_id,))
