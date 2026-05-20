-- ── Run this in Supabase SQL Editor ──────────────────────────────────────────

-- 1. Tables

create table if not exists accounts (
  id         text        primary key,
  name       text        not null,
  created_at timestamptz not null default now()
);

create table if not exists job_applications (
  id             text        primary key,
  title          text        not null,
  company        text        not null default '',
  link           text        not null default '',
  date_applied   text        not null,
  status         text        not null,
  account        text        not null default '',
  tags           text[]      not null default '{}',
  notes          text        not null default '',
  screenshot_url text        not null default '',
  resume_url     text        not null default '',
  created_at     timestamptz not null default now()
);

-- If job_applications already exists without the new columns:
alter table job_applications add column if not exists account        text not null default '';
alter table job_applications add column if not exists screenshot_url text not null default '';
alter table job_applications add column if not exists resume_url     text not null default '';


-- 2. Row Level Security — tables

alter table accounts         enable row level security;
alter table job_applications enable row level security;

create policy "public_access" on accounts         for all to anon using (true) with check (true);
create policy "public_access" on job_applications for all to anon using (true) with check (true);


-- 3. Storage — resumes bucket
-- First: go to Storage → New Bucket → name "resumes" → enable Public bucket → Save
-- Then run:

create policy "public_access on resumes"
on storage.objects for all to anon
using  (bucket_id = 'resumes')
with check (bucket_id = 'resumes');
