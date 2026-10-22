-- Esquema del bot. Idempotente: se puede ejecutar varias veces.
create extension if not exists pgcrypto;   -- gen_random_uuid() en Postgres < 13
create schema if not exists bot;

create table if not exists bot.users (
  id               bigserial primary key,
  project_id       text not null,
  external_user_id text not null,              -- id_paciente (sin FK: es otra BD)
  role             text,
  display_name     text,
  locale           text not null default 'es',
  created_at       timestamptz not null default now(),
  unique (project_id, external_user_id)
);

create table if not exists bot.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    bigint not null references bot.users(id) on delete cascade,
  channel    text not null default 'web',
  summary    text,                             -- resumen acumulado de lo viejo
  summarized_upto bigint not null default 0,   -- ultimo messages.id ya resumido
  started_at timestamptz not null default now(),
  last_at    timestamptz not null default now()
);
create index if not exists ix_conv_user on bot.conversations(user_id, last_at desc);

create table if not exists bot.messages (
  id              bigserial primary key,
  conversation_id uuid not null references bot.conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','tool')),
  content         text,
  tool_calls      jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists ix_msg_conv on bot.messages(conversation_id, id);

create table if not exists bot.user_facts (
  user_id    bigint not null references bot.users(id) on delete cascade,
  key        text not null,
  value      text not null,
  source     text not null default 'bot',      -- bot | user | system
  confidence real not null default 0.8,
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, key)
);

create table if not exists bot.tool_audit (
  id         bigserial primary key,
  user_id    bigint references bot.users(id) on delete set null,
  conversation_id uuid,
  tool       text not null,
  args       jsonb,
  result     jsonb,
  status     text not null,                    -- ok | error | denied | pending | rejected
  created_at timestamptz not null default now()
);
create index if not exists ix_audit_user on bot.tool_audit(user_id, created_at desc);

create table if not exists bot.pending_actions (
  id           uuid primary key default gen_random_uuid(),
  user_id      bigint not null references bot.users(id) on delete cascade,
  conversation_id uuid,
  tool         text not null,
  args         jsonb not null,
  summary      text not null,
  expires_at   timestamptz not null,
  resolved_at  timestamptz,
  outcome      text                            -- approved | rejected | expired
);
create index if not exists ix_pending_user on bot.pending_actions(user_id) where resolved_at is null;

-- Supabase: RLS activado y sin politicas => la API REST (anon/authenticated) no puede leer estas tablas.
-- El servicio Python se conecta directo a Postgres con el usuario de BOT_DATABASE_URL (no pasa por la API REST).
alter table bot.users           enable row level security;
alter table bot.conversations   enable row level security;
alter table bot.messages        enable row level security;
alter table bot.user_facts      enable row level security;
alter table bot.tool_audit      enable row level security;
alter table bot.pending_actions enable row level security;

-- Opcional (FAQ / politicas con busqueda semantica). Requiere pgvector (Supabase lo trae).
-- create extension if not exists vector;
-- create table if not exists bot.knowledge (
--   id bigserial primary key, project_id text not null, title text,
--   content text not null, embedding vector(768), updated_at timestamptz default now());
