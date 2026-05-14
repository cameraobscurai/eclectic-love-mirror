
insert into storage.buckets (id, name, public)
values ('incoming-photos', 'incoming-photos', true)
on conflict (id) do nothing;

create policy "incoming-photos public read"
on storage.objects for select
using (bucket_id = 'incoming-photos');

create policy "incoming-photos admin insert"
on storage.objects for insert
with check (bucket_id = 'incoming-photos' and public.has_role(auth.uid(), 'admin'));

create policy "incoming-photos admin update"
on storage.objects for update
using (bucket_id = 'incoming-photos' and public.has_role(auth.uid(), 'admin'));

create policy "incoming-photos admin delete"
on storage.objects for delete
using (bucket_id = 'incoming-photos' and public.has_role(auth.uid(), 'admin'));
