-- patient_overview: each patient with their number of visits and most recent visit,
-- for the Patients list. security_invoker makes the view run with the caller's rights,
-- so the RLS on patients and visits still limits each doctor to their own rows.

create view public.patient_overview
with (security_invoker = true)
as
select
  p.id,
  p.first_name,
  p.last_name,
  p.mobile_number,
  p.created_at,
  count(v.id)::integer as visit_count,
  max(v.visited_at) as last_visit_at
from public.patients p
left join public.visits v on v.patient_id = p.id
group by p.id;

revoke all on public.patient_overview from anon;
grant select on public.patient_overview to authenticated;
