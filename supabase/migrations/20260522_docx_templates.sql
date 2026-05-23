-- DOCX Template management
-- Run this in your Supabase SQL editor.

create table if not exists docx_templates (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  storage_path text        not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger docx_templates_updated_at
  before update on docx_templates
  for each row execute function set_updated_at();

alter table docx_templates disable row level security;

-- Create the Supabase Storage bucket for DOCX template files.
-- Run this separately if the bucket does not already exist:
--
-- insert into storage.buckets (id, name, public)
-- values ('docx-templates', 'docx-templates', false)
-- on conflict (id) do nothing;
--
-- Storage policy — allow service role full access (default when RLS is off):
-- No additional policies needed when using the service role key.
