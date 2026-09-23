-- Google Workspace UTM accounts only. Never authorize from user_metadata.
-- Enable the two Auth hooks after applying this migration (see docs/utm-access.md).
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon, supabase_auth_admin;

-- Auth admin can look up the provider-owned Google identity, not editable profile fields.
create or replace function private.is_utm_user(user_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from auth.users u join auth.identities i on i.user_id = u.id
    where u.id = $1
      and lower(u.email) ~ '^[^@[:space:]]+@utm\.my$'
      and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
      and i.provider = 'google'
      and lower(i.identity_data->>'email') = lower(u.email)
      and i.identity_data->'email_verified' = 'true'::jsonb
      and i.identity_data#>>'{custom_claims,hd}' = 'utm.my'
  );
$$;
revoke all on function private.is_utm_user(uuid) from public, anon, authenticated;
grant execute on function private.is_utm_user(uuid) to supabase_auth_admin;

-- Scoped internal lookup: the caller can only ask about their own authenticated uid.
create or replace function private.has_utm_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.is_utm_user(auth.uid());
$$;
revoke all on function private.has_utm_access() from public;
grant execute on function private.has_utm_access() to anon, authenticated;

create or replace function public.before_utm_user_created(event jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if coalesce(lower(event#>>'{user,email}') ~ '^[^@[:space:]]+@utm\.my$', false)
     and event#>>'{user,app_metadata,provider}' = 'google'
     and not coalesce((event#>>'{user,is_anonymous}')::boolean, false) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403,
    'message', 'UTM_ACCOUNT_REQUIRED: Use your Google Workspace @utm.my account.'));
end;
$$;

create or replace function public.utm_access_token(event jsonb)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if private.is_utm_user((event->>'user_id')::uuid)
     and event->>'authentication_method' in ('oauth', 'token_refresh') then
    return jsonb_set(event, '{claims,utm_access}', 'true'::jsonb);
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403,
    'message', 'UTM_ACCOUNT_REQUIRED: Use your Google Workspace @utm.my account.'));
end;
$$;
revoke all on function public.before_utm_user_created(jsonb) from public, anon, authenticated;
revoke all on function public.utm_access_token(jsonb) from public, anon, authenticated;
grant execute on function public.before_utm_user_created(jsonb) to supabase_auth_admin;
grant execute on function public.utm_access_token(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;

-- Restrictive policies compose with existing owner policies; never grant new row access.
do $$
declare target text;
begin
  foreach target in array array['projects','documents','archived_docs','cmgd_items','meetings'] loop
    execute format('alter table public.%I enable row level security', target);
    execute format('drop policy if exists utm_accounts_only on public.%I', target);
    execute format('create policy utm_accounts_only on public.%I as restrictive for all to public using ((select private.has_utm_access())) with check ((select private.has_utm_access()))', target);
  end loop;
end;
$$;

-- Public buckets bypass read policies. Archive views already use signed URLs.
update storage.buckets set public = false where id = 'documents';
drop policy if exists public_read on storage.objects;
drop policy if exists documents_utm_owner_only on storage.objects;
create policy documents_utm_owner_only on storage.objects as restrictive for all to public
using (bucket_id <> 'documents' or (
  (select private.has_utm_access()) and (storage.foldername(name))[1] = (select auth.uid())::text
)) with check (bucket_id <> 'documents' or (
  (select private.has_utm_access()) and (storage.foldername(name))[1] = (select auth.uid())::text
));
-- INSERT/SELECT policies already exist. Upserts additionally need UPDATE permission.
drop policy if exists documents_owner_update on storage.objects;
create policy documents_owner_update on storage.objects for update to authenticated
using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
