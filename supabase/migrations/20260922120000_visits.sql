-- Visits: one row each time a patient comes in to see their doctor (the patient's visit history).
-- Date and time are kept together in visited_at; the app shows them as separate columns.
-- Patient names and other details come from joining patients on patient_id.

create table public.visits (
  id uuid primary key default extensions.uuid_generate_v4(),
  doctor_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  visited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- A patient's history, newest first; and a doctor's visits by day
create index visits_patient_id_visited_at_idx on public.visits (patient_id, visited_at desc);
create index visits_doctor_id_visited_at_idx on public.visits (doctor_id, visited_at desc);

-- Row Level Security: signed-in doctors only, and only their own rows.
-- The patient must also belong to the same doctor.
alter table public.visits enable row level security;

create policy "Doctors read own visits" on public.visits
  for select to authenticated
  using ((select auth.uid()) = doctor_id);
create policy "Doctors add own visits" on public.visits
  for insert to authenticated
  with check (
    (select auth.uid()) = doctor_id
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.doctor_id = (select auth.uid())
    )
  );
create policy "Doctors update own visits" on public.visits
  for update to authenticated
  using ((select auth.uid()) = doctor_id)
  with check (
    (select auth.uid()) = doctor_id
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.doctor_id = (select auth.uid())
    )
  );
create policy "Doctors delete own visits" on public.visits
  for delete to authenticated
  using ((select auth.uid()) = doctor_id);

-- Signed-out visitors get no access
revoke all on public.visits from anon;
