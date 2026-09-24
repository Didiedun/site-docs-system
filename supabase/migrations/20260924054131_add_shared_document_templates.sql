-- A shared, read-only library for verified UTM accounts. Files remain private.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('templates', 'templates', false, 10485760,
  array['application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy templates_utm_read on storage.objects for select to authenticated
using (bucket_id = 'templates' and (select private.has_utm_access()));
create policy templates_utm_only on storage.objects as restrictive for select to public
using (bucket_id <> 'templates' or (select private.has_utm_access()));
-- Only the service role used for publishing can change shared templates.
create policy templates_no_client_insert on storage.objects as restrictive for insert to public
with check (bucket_id <> 'templates');
create policy templates_no_client_update on storage.objects as restrictive for update to public
using (bucket_id <> 'templates') with check (bucket_id <> 'templates');
create policy templates_no_client_delete on storage.objects as restrictive for delete to public
using (bucket_id <> 'templates');
commit;
