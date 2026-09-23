-- Add patient: first name, mobile number and a case study.
-- The case study is a photo (in the private case-photos bucket), typed notes, or both;
-- at least one of the two is required.

-- 1. Patients are added with a first name only; last name is optional
alter table public.patients alter column last_name drop not null;

-- 2. Case study columns
alter table public.patients
  add column case_notes text,
  -- Object path inside the case-photos bucket: <doctor_id>/<file name>
  add column case_photo_path text,
  add constraint patients_case_study_check check (
    nullif(btrim(case_notes), '') is not null or case_photo_path is not null
  ) not valid;

-- 3. Private bucket for case study photos: images only, 10 MB each
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-photos', 'case-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

-- 4. Each doctor can only use the folder named after their own user id
create policy "Doctors read own case photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'case-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Doctors upload own case photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'case-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Doctors delete own case photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'case-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
