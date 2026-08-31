-- EV Analyzer: core schema
create extension if not exists pgcrypto;

-- One vehicle per user for the MVP (MG4 XPower), schema left multi-vehicle-ready.
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  make text,
  model text,
  year int,
  battery_capacity_kwh numeric,
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);

-- A tariff product the user is/was on (e.g. "Octopus Go").
create table if not exists public.energy_tariffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'octopus',
  name text not null,
  currency text not null default 'EUR',
  standing_charge_per_day numeric,
  created_at timestamptz not null default now()
);

-- Time-of-use rate windows for a tariff, with effective date ranges so
-- historical price changes can be modeled.
create table if not exists public.tariff_rate_periods (
  id uuid primary key default gen_random_uuid(),
  tariff_id uuid not null references public.energy_tariffs(id) on delete cascade,
  rate_name text not null check (rate_name in ('off_peak', 'standard')),
  price_per_kwh numeric not null,
  time_start time not null,
  time_end time not null,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now()
);

-- Monthly bill summaries uploaded by the user (no half-hourly detail available).
create table if not exists public.electricity_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tariff_id uuid references public.energy_tariffs(id) on delete set null,
  billing_period_start date not null,
  billing_period_end date not null,
  total_kwh numeric not null,
  total_cost numeric not null,
  standing_charge_total numeric,
  source_import_id uuid,
  created_at timestamptz not null default now()
);

-- Home/public charging sessions, mainly imported from the Wallbox Silla CSV export.
create table if not exists public.charging_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  energy_kwh numeric not null,
  location_type text not null default 'home' check (location_type in ('home', 'public')),
  cost numeric,
  cost_breakdown jsonb,
  source_import_id uuid,
  created_at timestamptz not null default now()
);

-- Trips from Drivvo / ABRP (or manual entry).
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  source text not null check (source in ('drivvo', 'abrp', 'manual')),
  started_at timestamptz,
  ended_at timestamptz,
  distance_km numeric not null,
  energy_used_kwh numeric,
  efficiency_wh_per_km numeric,
  odometer_km numeric,
  cost numeric,
  battery_start_pct numeric,
  battery_end_pct numeric,
  notes text,
  source_import_id uuid,
  created_at timestamptz not null default now()
);

-- Audit trail for every uploaded file, with per-row error detail.
create table if not exists public.raw_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('octopus_bill', 'wallbox_export', 'drivvo_export', 'abrp_export')),
  storage_path text not null,
  original_filename text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'success', 'partial_error', 'error')),
  rows_total int,
  rows_imported int,
  rows_failed int,
  error_summary jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.electricity_bills
  add constraint electricity_bills_source_import_id_fkey
  foreign key (source_import_id) references public.raw_imports(id) on delete set null;

alter table public.charging_sessions
  add constraint charging_sessions_source_import_id_fkey
  foreign key (source_import_id) references public.raw_imports(id) on delete set null;

alter table public.trips
  add constraint trips_source_import_id_fkey
  foreign key (source_import_id) references public.raw_imports(id) on delete set null;

create index if not exists vehicles_user_id_idx on public.vehicles(user_id);
create index if not exists energy_tariffs_user_id_idx on public.energy_tariffs(user_id);
create index if not exists tariff_rate_periods_tariff_id_idx on public.tariff_rate_periods(tariff_id);
create index if not exists electricity_bills_user_id_idx on public.electricity_bills(user_id, billing_period_start);
create index if not exists charging_sessions_user_id_idx on public.charging_sessions(user_id, started_at);
create index if not exists trips_user_id_idx on public.trips(user_id, started_at);
create index if not exists raw_imports_user_id_idx on public.raw_imports(user_id, created_at);
