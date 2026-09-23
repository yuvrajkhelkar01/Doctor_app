-- Baseline: the schema as it was created in the Supabase dashboard (2026-09-21).
-- Already present in the remote project; recorded here so later migrations build on it.

create extension if not exists "uuid-ossp" with schema extensions;

create table if not exists public.doctor_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  mobile_number text,
  specialization text,
  license_number text,
  profile_photo_url text,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now()
);

create table if not exists public.patients (
  id uuid primary key default extensions.uuid_generate_v4(),
  doctor_id uuid not null references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  mobile_number text,
  date_of_birth date,
  medical_history text,
  created_at timestamp without time zone default now()
);

create table if not exists public.appointments (
  id uuid primary key default extensions.uuid_generate_v4(),
  doctor_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  appointment_date timestamp without time zone not null,
  status text default 'scheduled',
  notes text,
  created_at timestamp without time zone default now()
);

alter table public.doctor_profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;

create policy "Doctors see their own profile" on public.doctor_profiles
  for select using (auth.uid() = id);
create policy "Doctors see their own patients" on public.patients
  for select using (auth.uid() = doctor_id);
create policy "Doctors see their own appointments" on public.appointments
  for select using (auth.uid() = doctor_id);
