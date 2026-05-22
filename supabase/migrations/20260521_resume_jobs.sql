-- Resume generation jobs table
-- Tracks background generation jobs from the Generate page
create table if not exists resume_jobs (
  id                   uuid primary key default gen_random_uuid(),
  status               text not null default 'queued',
  -- 'queued' | 'generating' | 'uploading' | 'completed' | 'failed'
  job_description      text not null,
  resume_data          jsonb not null,
  prompt_content       text,
  context_content      text,
  model_id             text,
  profile_id           uuid references profiles(id) on delete set null,
  google_drive_file_id text,
  google_drive_link    text,
  file_name            text,
  error_message        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Index for fast status polling
create index if not exists resume_jobs_status_idx on resume_jobs(status);
create index if not exists resume_jobs_created_at_idx on resume_jobs(created_at desc);

-- Enable Supabase Realtime on this table
alter publication supabase_realtime add table resume_jobs;
