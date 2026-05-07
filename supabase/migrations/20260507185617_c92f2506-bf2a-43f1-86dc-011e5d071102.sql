update storage.buckets set public = true where id = 'videos';

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read videos bucket'
  ) then
    create policy "Public read videos bucket"
    on storage.objects
    for select
    to public
    using (bucket_id = 'videos');
  end if;
end $$;