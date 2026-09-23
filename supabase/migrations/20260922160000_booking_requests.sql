-- Booking form: patients ask for an appointment from a link the doctor shares on their website.
-- Requests land in booking_requests as unconfirmed entries; the doctor accepts or declines them
-- in the app. Nothing here lets the public read patient data.

-- 1. The secret in the doctor's form link. Regenerating it makes the old link stop working.
alter table public.doctor_profiles
  add column booking_token uuid not null default extensions.uuid_generate_v4();
create unique index doctor_profiles_booking_token_idx on public.doctor_profiles (booking_token);

-- 2. The requests themselves
create table public.booking_requests (
  id uuid primary key default extensions.uuid_generate_v4(),
  doctor_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  mobile_number text not null,
  preferred_at timestamptz not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  -- The patient this request became, once accepted
  patient_id uuid references public.patients (id) on delete set null,
  created_at timestamptz not null default now()
);

create index booking_requests_doctor_status_idx on public.booking_requests (doctor_id, status, preferred_at);

alter table public.booking_requests enable row level security;

-- Only the doctor the request was made to can see or act on it. Requests are created through
-- submit_booking_request below, never by inserting directly, so there's no insert policy.
create policy "Doctors read own booking requests" on public.booking_requests
  for select to authenticated
  using ((select auth.uid()) = doctor_id);
create policy "Doctors update own booking requests" on public.booking_requests
  for update to authenticated
  using ((select auth.uid()) = doctor_id)
  with check ((select auth.uid()) = doctor_id);
create policy "Doctors delete own booking requests" on public.booking_requests
  for delete to authenticated
  using ((select auth.uid()) = doctor_id);

revoke all on public.booking_requests from anon;

-- 3. Who the form belongs to: just enough to show "Book with Dr. …" on the page
create or replace function public.booking_form_doctor(token uuid)
returns table (first_name text, last_name text, specialization text)
language sql
security definer
stable
set search_path = ''
as $$
  select p.first_name, p.last_name, p.specialization
  from public.doctor_profiles p
  where p.booking_token = token;
$$;

-- 4. Submitting the form. Runs as the owner so the public never touches the table directly.
create or replace function public.submit_booking_request(
  token uuid,
  full_name text,
  mobile_number text,
  preferred_at timestamptz,
  note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  pending_count integer;
begin
  select id into target from public.doctor_profiles where booking_token = token;
  if target is null then
    return false;
  end if;

  if length(btrim(full_name)) < 2 or length(btrim(mobile_number)) < 6 then
    raise exception 'Please enter your name and phone number.';
  end if;

  if preferred_at < now() - interval '1 hour' or preferred_at > now() + interval '1 year' then
    raise exception 'Please choose a time in the next year.';
  end if;

  -- Keep one person from flooding a doctor with requests
  select count(*) into pending_count
  from public.booking_requests r
  where r.doctor_id = target
    and r.mobile_number = btrim(submit_booking_request.mobile_number)
    and r.status = 'pending';
  if pending_count >= 3 then
    raise exception 'You already have requests waiting. The clinic will contact you soon.';
  end if;

  insert into public.booking_requests (doctor_id, full_name, mobile_number, preferred_at, note)
  values (
    target,
    btrim(submit_booking_request.full_name),
    btrim(submit_booking_request.mobile_number),
    preferred_at,
    nullif(btrim(note), '')
  );
  return true;
end;
$$;

-- 5. A new link for the signed-in doctor; the old one stops working
create or replace function public.regenerate_booking_token()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  fresh uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  update public.doctor_profiles
  set booking_token = extensions.uuid_generate_v4()
  where id = auth.uid()
  returning booking_token into fresh;

  return fresh;
end;
$$;

revoke all on function public.booking_form_doctor(uuid) from public;
revoke all on function public.submit_booking_request(uuid, text, text, timestamptz, text) from public;
revoke all on function public.regenerate_booking_token() from public;

-- The form is used by people who aren't signed in
grant execute on function public.booking_form_doctor(uuid) to anon, authenticated;
grant execute on function public.submit_booking_request(uuid, text, text, timestamptz, text) to anon, authenticated;
grant execute on function public.regenerate_booking_token() to authenticated;
