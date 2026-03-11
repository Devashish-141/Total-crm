-- Service Reports Table
-- Run this in the Supabase SQL editor

create table if not exists service_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  job_id uuid references jobs(id) on delete cascade,
  customer_id uuid references customers(id),
  report_data jsonb not null,
  tester text,
  test_date date,
  machine_make text
);

-- Enable RLS
alter table service_reports enable row level security;

-- Allow authenticated users full access
create policy "Authenticated users can manage service reports"
  on service_reports
  for all
  to authenticated
  using (true)
  with check (true);
