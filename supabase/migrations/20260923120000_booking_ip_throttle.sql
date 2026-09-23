-- Rate limits the public booking form per caller IP, per doctor: 3 requests an hour.
-- The per-phone cap in submit_booking_request only stops one person spamming under one number;
-- changing the number sidesteps it, so this bounds how fast a single source can fill a doctor's
-- dashboard. It is a speed bump, not a wall — rotating IPs defeats it — so it sits alongside the
-- per-phone cap rather than replacing it.

-- 1. Where the counting happens. Short-lived: rows are cleared once they fall outside the window,
-- so this never becomes a log of who visited which doctor's form.
create table public.booking_throttle (
  doctor_id uuid not null references auth.users (id) on delete cascade,
  -- md5 of the caller's IP salted with the doctor's id. Never the raw address, and the same
  -- visitor hashes differently for each doctor, so these can't be joined across doctors.
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);

create index booking_throttle_lookup_idx on public.booking_throttle (doctor_id, ip_hash, attempted_at);

-- Nobody reaches this table directly; only submit_booking_request, which runs as the owner.
alter table public.booking_throttle enable row level security;
revoke all on public.booking_throttle from anon, authenticated;

-- 2. The caller's IP, or null when we can't tell (a direct SQL call, say), in which case the
-- throttle is skipped rather than locking everyone into one shared bucket.
--
-- Header choice matters. A client can send its own x-forwarded-for, and the proxy appends the
-- real peer to the RIGHT of whatever arrived, so the leftmost entry is attacker-controlled and
-- the rightmost is the trustworthy one. Cloudflare's cf-connecting-ip is overwritten at the edge
-- and can't be spoofed at all, so prefer it and fall back to the last x-forwarded-for entry.
create or replace function public.caller_ip()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  headers json;
  forwarded text;
begin
  headers := nullif(current_setting('request.headers', true), '')::json;
  if headers is null then
    return null;
  end if;

  forwarded := headers ->> 'cf-connecting-ip';
  if forwarded is null then
    -- last comma-separated entry, i.e. the hop the proxy added itself
    forwarded := substring(headers ->> 'x-forwarded-for' from '([^,[:space:]]+)[[:space:]]*$');
  end if;

  return nullif(btrim(forwarded), '');
end;
$$;

-- 3. Fold the limit into the existing submit path.
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

    if recent_count >= 3 then
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

revoke all on function public.caller_ip() from public;
revoke all on function public.submit_booking_request(uuid, text, text, timestamptz, text) from public;
grant execute on function public.submit_booking_request(uuid, text, text, timestamptz, text) to anon, authenticated;
