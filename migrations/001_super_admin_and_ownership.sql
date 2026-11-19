-- ═══════════════════════════════════════════════════════════════════════
--  HexNinja — 001: super_admin role + per-admin data ownership
--  Run once in Supabase → SQL Editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- 1. Allow the new role --------------------------------------------------
alter table public.team_users drop constraint if exists team_users_role_check;
alter table public.team_users
  add constraint team_users_role_check
  check (role = any (array['super_admin'::text, 'admin'::text, 'assistant'::text]));

-- 2. Promote the owner account -------------------------------------------
update public.team_users set role = 'super_admin' where email = 'hexninja@gmail.com';

-- 3. Owner columns (the admin who owns the row) ---------------------------
alter table public.prompts        add column if not exists owner_id uuid references public.team_users(id) on delete set null;
alter table public.docx_templates add column if not exists owner_id uuid references public.team_users(id) on delete set null;
alter table public.profiles       add column if not exists owner_id uuid references public.team_users(id) on delete set null;

create index if not exists prompts_owner_id_idx        on public.prompts (owner_id);
create index if not exists docx_templates_owner_id_idx on public.docx_templates (owner_id);
create index if not exists profiles_owner_id_idx       on public.profiles (owner_id);
create index if not exists applications_profile_id_idx on public.applications (profile_id);
create index if not exists applications_created_by_idx on public.applications (created_by);

-- 4. Existing rows without an owner belong to the super admin -------------
update public.prompts        set owner_id = (select id from public.team_users where role = 'super_admin' order by created_at limit 1) where owner_id is null;
update public.docx_templates set owner_id = (select id from public.team_users where role = 'super_admin' order by created_at limit 1) where owner_id is null;
update public.profiles       set owner_id = (select id from public.team_users where role = 'super_admin' order by created_at limit 1) where owner_id is null;

-- 5. One default prompt per owner (was: one global default) ---------------
drop index if exists public.prompts_is_default_unique_idx;
create unique index if not exists prompts_owner_default_unique_idx
  on public.prompts (owner_id) where is_default;

commit;
