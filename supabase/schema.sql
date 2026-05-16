-- AI Resume Tailor - Supabase Schema
-- Run this in your Supabase SQL editor to set up the database.

create table if not exists profiles (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  resume_data jsonb       not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists prompts (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  content    text        not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contexts (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  content    text        not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto-update updated_at on every row change
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger prompts_updated_at
  before update on prompts
  for each row execute function set_updated_at();

create trigger contexts_updated_at
  before update on contexts
  for each row execute function set_updated_at();

create table if not exists templates (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  config     jsonb       not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger templates_updated_at
  before update on templates
  for each row execute function set_updated_at();

-- Single-user setup: disable RLS (or configure it for your needs)
alter table profiles  disable row level security;
alter table prompts   disable row level security;
alter table contexts  disable row level security;
alter table templates disable row level security;
