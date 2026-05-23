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

-- Single-user setup: disable RLS (or configure it for your needs)
alter table profiles  disable row level security;
alter table prompts   disable row level security;
alter table contexts  disable row level security;

create table if not exists applications (
  id                   uuid        primary key default gen_random_uuid(),
  seq                  serial      unique,
  job_url              text,
  role                 text        not null,
  company_name         text        not null,
  job_description      text        not null,
  profile_id           uuid        references profiles(id) on delete set null,
  status               text        not null default 'pending',
  pipeline_status      text        not null default 'applied',
  google_drive_link    text,
  google_drive_file_id text,
  error_message        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Run this if the table already exists:
-- alter table applications add column if not exists pipeline_status text not null default 'applied';
-- alter table applications add column if not exists seq serial unique;

-- Migrate pipeline_status to unified values (run once on existing data):
-- update applications set pipeline_status = 'hr_interview' where pipeline_status in ('screening', 'hr_interview');
-- update applications set pipeline_status = 'tech_1'       where pipeline_status in ('interview', 'tech_round_1');
-- update applications set pipeline_status = 'tech_2'       where pipeline_status = 'tech_round_2';
-- update applications set pipeline_status = 'failed'       where pipeline_status in ('rejected', 'withdrawn');

create trigger applications_updated_at
  before update on applications
  for each row execute function set_updated_at();

alter table applications disable row level security;
