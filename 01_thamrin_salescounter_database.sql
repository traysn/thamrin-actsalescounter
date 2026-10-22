-- THAMRIN SALES COUNTER: initial schema
-- Run once in Supabase SQL Editor. No public table access is granted.
create extension if not exists pgcrypto;

create table if not exists public.master_uploads (
 id uuid primary key default gen_random_uuid(),
 filename text not null,
 uploaded_by uuid references auth.users(id) on delete set null,
 uploaded_at timestamptz not null default now(),
 row_count integer not null default 0 check (row_count >= 0),
 notes text
);

create table if not exists public.sales_counters (
 id uuid primary key default gen_random_uuid(),
 sales_id text not null unique,
 full_name text not null,
 branch text not null,
 amd text,
 employment_status text not null default 'Active',
 po_count integer not null default 0 check (po_count >= 0),
 whatsapp text,
 last_master_upload_id uuid references public.master_uploads(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint sales_counters_name_nonblank check (length(trim(full_name)) > 0),
 constraint sales_counters_branch_nonblank check (length(trim(branch)) > 0)
);

create table if not exists public.employee_history (
 id uuid primary key default gen_random_uuid(),
 sales_counter_id uuid not null references public.sales_counters(id) on delete cascade,
 changed_at timestamptz not null default now(),
 upload_id uuid references public.master_uploads(id) on delete set null,
 previous_values jsonb,
 new_values jsonb not null,
 change_type text not null check (change_type in ('created','updated','deactivated','reactivated','transferred','po_changed'))
);

-- One row per employee per calendar day records the actual monitoring roster.
-- Snapshot rows prevent later master uploads from rewriting old compliance metrics.
create table if not exists public.daily_roster (
 id uuid primary key default gen_random_uuid(),
 roster_date date not null,
 sales_counter_id uuid not null references public.sales_counters(id) on delete restrict,
 sales_id_snapshot text not null,
 name_snapshot text not null,
 branch_snapshot text not null,
 amd_snapshot text,
 is_required boolean not null default true,
 created_at timestamptz not null default now(),
 unique (roster_date, sales_counter_id)
);

create table if not exists public.activity_reports (
 id uuid primary key default gen_random_uuid(),
 sales_counter_id uuid references public.sales_counters(id) on delete set null,
 entered_name text not null,
 entered_branch text not null,
 whatsapp text not null,
 activity_date date not null,
 submitted_at timestamptz not null default now(),
 match_status text not null default 'pending' check (match_status in ('pending','matched','rejected')),
 -- A verified employee ID is assigned by the backend only after identity matching.
 verification_notes text,
 constraint activity_reports_name_nonblank check (length(trim(entered_name)) > 0),
 constraint activity_reports_branch_nonblank check (length(trim(entered_branch)) > 0),
 constraint activity_reports_wa_nonblank check (length(trim(whatsapp)) > 0)
);

create table if not exists public.activity_details (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.activity_reports(id) on delete cascade,
 activity_type text not null check (activity_type in (
  'follow_up_ro','live_social_media','komunitas_gathering',
  'fleet_corporate_visit','showroom_event','iklan_berbayar'
 )),
 answers jsonb not null default '{}'::jsonb,
 leads integer not null default 0 check (leads >= 0),
 prospects integer not null default 0 check (prospects >= 0),
 hot_prospects integer not null default 0 check (hot_prospects >= 0),
 po integer not null default 0 check (po >= 0),
 created_at timestamptz not null default now(),
 unique (report_id, activity_type)
);

create table if not exists public.activity_photos (
 id uuid primary key default gen_random_uuid(),
 detail_id uuid not null references public.activity_details(id) on delete cascade,
 storage_path text not null unique,
 created_at timestamptz not null default now()
);

-- Supervisor links: store only a SHA-256 hash of a randomly generated secret token.
-- Never store or expose the plaintext token in this table.
create table if not exists public.supervisor_links (
 id uuid primary key default gen_random_uuid(),
 label text not null,
 token_hash text not null unique,
 created_at timestamptz not null default now(),
 expires_at timestamptz,
 revoked_at timestamptz,
 last_used_at timestamptz
);

create index if not exists idx_sales_counter_branch on public.sales_counters(branch);
create index if not exists idx_sales_counter_status_po on public.sales_counters(employment_status, po_count);
create index if not exists idx_roster_date_branch on public.daily_roster(roster_date, branch_snapshot);
create index if not exists idx_reports_date on public.activity_reports(activity_date);
create index if not exists idx_reports_employee_date on public.activity_reports(sales_counter_id, activity_date);
create index if not exists idx_details_type on public.activity_details(activity_type);
create index if not exists idx_history_employee on public.employee_history(sales_counter_id, changed_at desc);

-- RLS on every public table. No anon/authenticated policies yet:
-- browsers cannot read/write employee PII or report data directly.
alter table public.master_uploads enable row level security;
alter table public.sales_counters enable row level security;
alter table public.employee_history enable row level security;
alter table public.daily_roster enable row level security;
alter table public.activity_reports enable row level security;
alter table public.activity_details enable row level security;
alter table public.activity_photos enable row level security;
alter table public.supervisor_links enable row level security;

-- Extra hardening: revoke grants from client-side API roles.
revoke all on table public.master_uploads from anon, authenticated;
revoke all on table public.sales_counters from anon, authenticated;
revoke all on table public.employee_history from anon, authenticated;
revoke all on table public.daily_roster from anon, authenticated;
revoke all on table public.activity_reports from anon, authenticated;
revoke all on table public.activity_details from anon, authenticated;
revoke all on table public.activity_photos from anon, authenticated;
revoke all on table public.supervisor_links from anon, authenticated;

-- Admin Auth and server-side authorization will be configured in a later step.
-- Backend service-role access bypasses RLS and MUST remain server-only.
