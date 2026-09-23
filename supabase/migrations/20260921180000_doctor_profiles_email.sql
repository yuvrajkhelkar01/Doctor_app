-- doctor_profiles.email: a copy of the doctor's login email (auth.users.email),
-- kept in sync by triggers. Doctors can't edit it directly; it follows their account.

alter table public.doctor_profiles add column email text;

-- Fill it in for doctors who signed up before this migration
update public.doctor_profiles p
set email = u.email
from auth.users u
where u.id = p.id;

-- Sign-up trigger: now also copies the email
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.doctor_profiles (id, first_name, last_name, mobile_number, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.raw_user_meta_data ->> 'mobile_number',
    new.email
  );
  return new;
end;
$$;

-- Keep it in sync when a doctor changes their login email
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.doctor_profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Doctors may only edit their own profile details, not email, id or timestamps
revoke update on public.doctor_profiles from authenticated;
grant update (first_name, last_name, mobile_number, specialization, license_number, profile_photo_url)
  on public.doctor_profiles to authenticated;
