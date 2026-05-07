insert into storage.buckets (id, name, public)
values ('squarespace-mirror', 'squarespace-mirror', true)
on conflict (id) do nothing;

create policy "Public read squarespace-mirror"
  on storage.objects for select
  using (bucket_id = 'squarespace-mirror');

create policy "Admins write squarespace-mirror"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'squarespace-mirror' and has_role(auth.uid(),'admin'));

create policy "Admins update squarespace-mirror"
  on storage.objects for update to authenticated
  using (bucket_id = 'squarespace-mirror' and has_role(auth.uid(),'admin'));

create policy "Admins delete squarespace-mirror"
  on storage.objects for delete to authenticated
  using (bucket_id = 'squarespace-mirror' and has_role(auth.uid(),'admin'));