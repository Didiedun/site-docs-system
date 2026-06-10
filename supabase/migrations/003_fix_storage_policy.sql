-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 003 — Fix missing storage read policy
-- Run this in Supabase SQL Editor if documents show "HTTP 400" when opening.
--
-- Root cause: migration 002 used CREATE POLICY IF NOT EXISTS which is invalid
-- PostgreSQL syntax. The bucket became private but the read policy was never
-- created, so all signed URL generation fails and public_url returns 400.
-- ═══════════════════════════════════════════════════════════════════════════
drop policy if exists "authenticated_read" on storage.objects;

create policy "authenticated_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
