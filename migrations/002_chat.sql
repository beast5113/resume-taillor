-- ═══════════════════════════════════════════════════════════════════════
--  HexNinja — 002: team chat (direct messages + a team-wide General room)
--  Run once in Supabase → SQL Editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- conversation_key: 'general' for the team room, or
-- 'dm:<lower user id>:<higher user id>' for a direct conversation.
create table if not exists public.chat_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_key text not null,
  sender_id        uuid not null references public.team_users(id) on delete cascade,
  recipient_id     uuid references public.team_users(id) on delete cascade, -- null = General
  body             text not null check (char_length(body) between 1 and 4000),
  created_at       timestamptz not null default now()
);

create index if not exists chat_messages_conv_created_idx on public.chat_messages (conversation_key, created_at desc);
create index if not exists chat_messages_recipient_idx    on public.chat_messages (recipient_id, created_at desc);
create index if not exists chat_messages_sender_idx       on public.chat_messages (sender_id, created_at desc);

-- Per-user read position in each conversation (drives unread badges).
create table if not exists public.chat_reads (
  user_id          uuid not null references public.team_users(id) on delete cascade,
  conversation_key text not null,
  last_read_at     timestamptz not null default now(),
  primary key (user_id, conversation_key)
);

-- Only the server (service role key) touches these tables; RLS on with no
-- policies means the public anon key can never read them.
alter table public.chat_messages enable row level security;
alter table public.chat_reads    enable row level security;

commit;
