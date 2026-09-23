-- Appointment length, so the dashboard calendar can draw each appointment as a block.
-- Existing appointments get the default of 30 minutes.

alter table public.appointments
  add column duration_minutes integer not null default 30,
  add constraint appointments_duration_check check (duration_minutes between 5 and 480);
