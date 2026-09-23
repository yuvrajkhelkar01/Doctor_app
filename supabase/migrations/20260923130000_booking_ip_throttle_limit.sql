-- Raises the per-IP hourly limit on the public booking form from 3 requests to 30.
-- Three turned out to be too tight for shared addresses: a clinic's waiting-room wifi, a family
-- on one connection or a carrier NAT all look like a single IP, so real patients were hitting the
-- limit. Thirty an hour still bounds how fast one source can fill a doctor's dashboard, and the
-- per-phone cap of three pending requests (unchanged, below) remains the tighter of the two for
-- anyone booking under one number.
--
-- Only the threshold changes; the function is otherwise the one from the previous migration.

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
  ip text;
  ip_key text;
  window_start timestamptz;
  recent_count integer;
begin
  select id into target from public.doctor_profiles where booking_token = token;
  if target is null then
    return false;
  end if;

  ip := public.caller_ip();
  window_start := now() - interval '1 hour';

  if ip is not null then
    ip_key := md5(ip || target::text);

    select count(*) into recent_count
    from public.booking_throttle t
    where t.doctor_id = target
      and t.ip_hash = ip_key
      and t.attempted_at > window_start;

    if recent_count >= 30 then
      raise exception 'You have sent a few requests already. Please try again in an hour, or call the clinic directly.';
    end if;
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

  -- Recorded last, and only on success. Every `raise` above rolls the whole call back, so an
  -- attempt written earlier would be undone anyway — which is fine, because a rejected request
  -- creates no booking_requests row and so isn't what the limit is there to bound. Don't move
  -- this above the insert expecting failed attempts to count; they can't.
  if ip is not null then
    insert into public.booking_throttle (doctor_id, ip_hash) values (target, ip_key);
    -- Opportunistic cleanup, so the table stays roughly the size of the last hour of traffic
    delete from public.booking_throttle t where t.doctor_id = target and t.attempted_at <= window_start;
  end if;

  return true;
end;
$$;

revoke all on function public.submit_booking_request(uuid, text, text, timestamptz, text) from public;
grant execute on function public.submit_booking_request(uuid, text, text, timestamptz, text) to anon, authenticated;
