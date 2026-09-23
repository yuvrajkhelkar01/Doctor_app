-- Doctors-only app: every signed-up user is a doctor who manages their own patients.

-- 1. Timestamps with time zone (tables are empty, so conversion is safe)
alter table public.doctor_profiles
  alter column created_at type timestamptz,
  alter column updated_at type timestamptz;
alter table public.patients
  alter column created_at type timestamptz;
alter table public.appointments
  alter column appointment_date type timestamptz,
  alter column created_at type timestamptz;

-- 2. Appointment status: fixed set of values, always present
update public.appointments set status = 'scheduled' where status is null;
alter table public.appointments
  alter column status set not null,
  add constraint appointments_status_check
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show'));

-- 3. Indexes for the lookups RLS and the app do constantly
create index if not exists patients_doctor_id_idx on public.patients (doctor_id);
create index if not exists appointments_doctor_id_date_idx on public.appointments (doctor_id, appointment_date);
create index if not exists appointments_patient_id_idx on public.appointments (patient_id);

-- 4. Create the doctor's profile automatically at sign-up, from the sign-up form's metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.doctor_profiles (id, first_name, last_name, mobile_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.raw_user_meta_data ->> 'mobile_number'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Keep doctor_profiles.updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger doctor_profiles_set_updated_at
  before update on public.doctor_profiles
  for each row execute function public.set_updated_at();

-- 6. Row Level Security: signed-in doctors only, and only their own rows.
--    Replaces the original read-only policies.
drop policy if exists "Doctors see their own profile" on public.doctor_profiles;
drop policy if exists "Doctors see their own patients" on public.patients;
drop policy if exists "Doctors see their own appointments" on public.appointments;

-- doctor_profiles: created by the trigger, removed when the account is deleted
create policy "Doctors read own profile" on public.doctor_profiles
  for select to authenticated
  using ((select auth.uid()) = id);
create policy "Doctors update own profile" on public.doctor_profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- patients
create policy "Doctors read own patients" on public.patients
  for select to authenticated
  using ((select auth.uid()) = doctor_id);
create policy "Doctors add own patients" on public.patients
  for insert to authenticated
  with check ((select auth.uid()) = doctor_id);
create policy "Doctors update own patients" on public.patients
  for update to authenticated
  using ((select auth.uid()) = doctor_id)
  with check ((select auth.uid()) = doctor_id);
create policy "Doctors delete own patients" on public.patients
  for delete to authenticated
  using ((select auth.uid()) = doctor_id);

-- appointments: the patient must also belong to the same doctor
create policy "Doctors read own appointments" on public.appointments
  for select to authenticated
  using ((select auth.uid()) = doctor_id);
create policy "Doctors add own appointments" on public.appointments
  for insert to authenticated
  with check (
    (select auth.uid()) = doctor_id
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.doctor_id = (select auth.uid())
    )
  );
create policy "Doctors update own appointments" on public.appointments
  for update to authenticated
  using ((select auth.uid()) = doctor_id)
  with check (
    (select auth.uid()) = doctor_id
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.doctor_id = (select auth.uid())
    )
  );
create policy "Doctors delete own appointments" on public.appointments
  for delete to authenticated
  using ((select auth.uid()) = doctor_id);

-- 7. Signed-out visitors get no table access at all
revoke all on public.doctor_profiles, public.patients, public.appointments from anon;
