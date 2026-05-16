-- AccessScope v1 — Storage Buckets

-- logos: public (used in PDF generation via absolute URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos', 'logos', true, 2097152,  -- 2MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
);

-- photos: private (job site photos, accessed via signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', false, 10485760,  -- 10MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic']
);

-- pdfs: private (generated proposal packets, accessed via signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pdfs', 'pdfs', false, 20971520,  -- 20MB
  array['application/pdf']
);

-- Storage RLS: logos (public read, own write)
create policy "logos: public read"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos: contractor upload"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "logos: contractor update"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: photos (own only)
create policy "photos: contractor access"
  on storage.objects for all
  using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: pdfs (own only)
create policy "pdfs: contractor access"
  on storage.objects for all
  using (
    bucket_id = 'pdfs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
