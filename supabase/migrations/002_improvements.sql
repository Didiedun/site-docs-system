-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 002 — Security & audit improvements
-- Run in Supabase SQL Editor BEFORE deploying the updated frontend code.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Audit trail: store the raw notes used to generate each document ──────
alter table archived_docs
  add column if not exists source_payload jsonb;

-- ─── 2. Project linkage: nullable text so existing rows are unaffected ────────
-- (A proper uuid FK to projects will be added once project selection UI exists)
alter table archived_docs
  add column if not exists project_id text;

alter table cmgd_items
  add column if not exists project_id text;

-- ─── 3. Make the documents storage bucket private ────────────────────────────
-- After this runs, all existing public_url values in archived_docs will stop
-- working. The app now generates short-lived signed URLs at read time instead.
update storage.buckets
  set public = false
  where id = 'documents';

-- Drop the blanket public read policy
drop policy if exists "public_read" on storage.objects;

-- Authenticated users can read their own files (needed for signed URL generation)
-- Signed URLs bypass RLS, so this policy covers direct authenticated access only.
create policy if not exists "authenticated_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
