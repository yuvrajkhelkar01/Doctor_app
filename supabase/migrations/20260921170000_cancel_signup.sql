-- "Cancel" button in the sign-up confirmation email.
-- Deletes a not-yet-confirmed account, identified by the secret token hash from that email.
-- Deleting the auth user also deletes its doctor_profiles row (on delete cascade).

create or replace function public.cancel_signup(token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  -- Confirmed users have an empty token; never match those
  if token_hash is null or length(token_hash) < 20 then
    return false;
  end if;

  select id into target
  from auth.users
  where confirmation_token = token_hash
    and email_confirmed_at is null;

  if target is null then
    return false;
  end if;

  delete from auth.users where id = target;
  return true;
end;
$$;

-- Called from the app by someone who isn't signed in yet
revoke all on function public.cancel_signup(text) from public;
grant execute on function public.cancel_signup(text) to anon, authenticated;
