-- Storage bucket para logos de comunidades.
-- Public read (los logos aparecen en previews de invitaciones antes de login).
-- Write/Update/Delete restringido al owner de la comunidad referenciada en el path.
-- Path convention: '<community_id>/<random>.<ext>'

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-logos',
  'community-logos',
  true,
  2097152, -- 2 MB
  array['image/png','image/jpeg','image/webp','image/svg+xml']
)
on conflict (id) do nothing;

-- Policies sobre storage.objects para el bucket 'community-logos'.

drop policy if exists "community_logos_select_public" on storage.objects;
create policy "community_logos_select_public"
  on storage.objects
  for select
  using (bucket_id = 'community-logos');

drop policy if exists "community_logos_insert_owner" on storage.objects;
create policy "community_logos_insert_owner"
  on storage.objects
  for insert
  with check (
    bucket_id = 'community-logos'
    and auth.uid() is not null
    and exists (
      select 1
      from public.communities c
      where c.id = split_part(storage.objects.name, '/', 1)::uuid
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "community_logos_update_owner" on storage.objects;
create policy "community_logos_update_owner"
  on storage.objects
  for update
  using (
    bucket_id = 'community-logos'
    and auth.uid() is not null
    and exists (
      select 1
      from public.communities c
      where c.id = split_part(storage.objects.name, '/', 1)::uuid
        and c.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'community-logos'
    and auth.uid() is not null
    and exists (
      select 1
      from public.communities c
      where c.id = split_part(storage.objects.name, '/', 1)::uuid
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "community_logos_delete_owner" on storage.objects;
create policy "community_logos_delete_owner"
  on storage.objects
  for delete
  using (
    bucket_id = 'community-logos'
    and auth.uid() is not null
    and exists (
      select 1
      from public.communities c
      where c.id = split_part(storage.objects.name, '/', 1)::uuid
        and c.owner_id = auth.uid()
    )
  );
