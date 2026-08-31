-- Private bucket for raw uploaded files (bills, Wallbox/Drivvo/ABRP CSV exports).
-- Objects are stored at "<user_id>/<source_type>/<uuid>-<filename>".
insert into storage.buckets (id, name, public)
values ('raw-imports', 'raw-imports', false)
on conflict (id) do nothing;

create policy "raw_imports_bucket_select_own" on storage.objects for select
  using (bucket_id = 'raw-imports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "raw_imports_bucket_insert_own" on storage.objects for insert
  with check (bucket_id = 'raw-imports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "raw_imports_bucket_update_own" on storage.objects for update
  using (bucket_id = 'raw-imports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "raw_imports_bucket_delete_own" on storage.objects for delete
  using (bucket_id = 'raw-imports' and (storage.foldername(name))[1] = auth.uid()::text);
