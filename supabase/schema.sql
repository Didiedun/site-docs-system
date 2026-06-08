-- ═══════════════════════════════════════════════════════════════════════════
-- Sistem Dokumen Tapak — Supabase Schema
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Core tables ─────────────────────────────────────────────────────────────

create table if not exists projects (
  id           text primary key,
  tajuk        text not null,
  contractor   text,
  contract_no  text,
  start_date   date,
  finish_date  date,
  attendees    jsonb default '[]',
  signatories  jsonb default '{}',
  created_at   timestamptz default now()
);

create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  text references projects(id),
  kind        text not null check (kind in ('memo','minit','diary')),
  memo_type   text,
  body        text not null,
  created_at  timestamptz default now()
);

create index if not exists documents_project_idx on documents(project_id, created_at desc);

-- ─── Archived documents (HTML saved to Storage) ──────────────────────────────

create table if not exists archived_docs (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  kind         text not null check (kind in ('memo','minit','diary')),
  html_path    text not null,          -- Supabase Storage path
  public_url   text not null,          -- public URL to open the document
  project_name text,
  user_id      uuid references auth.users(id) on delete set null,
  created_at   timestamptz default now()
);

create index if not exists archived_docs_user_idx on archived_docs(user_id, created_at desc);

-- ─── CMGD — Certificate of Making Good Defects ───────────────────────────────

create table if not exists cmgd_items (
  id                         uuid primary key default gen_random_uuid(),
  project_name               text not null,
  contractor                 text not null,
  contract_no                text,
  practical_completion_date  date not null,
  dlp_months                 int  not null default 12,
  dlp_end_date               date not null,
  cmgd_issued_date           date,
  notes                      text,
  user_id                    uuid references auth.users(id) on delete set null,
  created_at                 timestamptz default now()
);

create index if not exists cmgd_user_idx on cmgd_items(user_id, dlp_end_date);

-- ─── Meetings ─────────────────────────────────────────────────────────────────

create table if not exists meetings (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  description        text,
  start_time         timestamptz not null,
  end_time           timestamptz,
  meet_link          text,
  calendar_event_id  text,
  attendees          jsonb default '[]',
  user_id            uuid references auth.users(id) on delete set null,
  created_at         timestamptz default now()
);

create index if not exists meetings_user_idx on meetings(user_id, start_time);

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security (enable before going to production)
-- ═══════════════════════════════════════════════════════════════════════════

alter table archived_docs enable row level security;
alter table cmgd_items    enable row level security;
alter table meetings      enable row level security;

-- archived_docs: each user sees only their own docs
create policy "archived_docs_owner" on archived_docs
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- cmgd_items: each user manages their own records
create policy "cmgd_owner" on cmgd_items
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- meetings: each user manages their own records
create policy "meetings_owner" on meetings
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Storage: create a "documents" bucket for HTML document storage
-- Run this AFTER creating the bucket in Supabase Dashboard → Storage
-- ═══════════════════════════════════════════════════════════════════════════

-- In Supabase Dashboard → Storage → New bucket:
--   Name: documents
--   Public: true (so public_url works without auth)
--
-- Then add this storage policy:

insert into storage.buckets (id, name, public) values ('documents', 'documents', true)
  on conflict (id) do nothing;

create policy "authenticated_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "public_read" on storage.objects
  for select to public
  using (bucket_id = 'documents');

create policy "owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
