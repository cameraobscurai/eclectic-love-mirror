insert into storage.buckets (id, name, public) values ('category-covers','category-covers',true) on conflict (id) do nothing;

create policy "Public read category-covers" on storage.objects for select using (bucket_id = 'category-covers');
create policy "Admins insert category-covers" on storage.objects for insert to authenticated with check (bucket_id = 'category-covers' and has_role(auth.uid(), 'admin'));
create policy "Admins update category-covers" on storage.objects for update to authenticated using (bucket_id = 'category-covers' and has_role(auth.uid(), 'admin')) with check (bucket_id = 'category-covers' and has_role(auth.uid(), 'admin'));
create policy "Admins delete category-covers" on storage.objects for delete to authenticated using (bucket_id = 'category-covers' and has_role(auth.uid(), 'admin'));