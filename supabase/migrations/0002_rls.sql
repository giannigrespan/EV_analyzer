-- Row Level Security: every table is scoped to its owning user.
alter table public.vehicles enable row level security;
alter table public.energy_tariffs enable row level security;
alter table public.tariff_rate_periods enable row level security;
alter table public.electricity_bills enable row level security;
alter table public.charging_sessions enable row level security;
alter table public.trips enable row level security;
alter table public.raw_imports enable row level security;

create policy "vehicles_select_own" on public.vehicles for select using (auth.uid() = user_id);
create policy "vehicles_insert_own" on public.vehicles for insert with check (auth.uid() = user_id);
create policy "vehicles_update_own" on public.vehicles for update using (auth.uid() = user_id);
create policy "vehicles_delete_own" on public.vehicles for delete using (auth.uid() = user_id);

create policy "energy_tariffs_select_own" on public.energy_tariffs for select using (auth.uid() = user_id);
create policy "energy_tariffs_insert_own" on public.energy_tariffs for insert with check (auth.uid() = user_id);
create policy "energy_tariffs_update_own" on public.energy_tariffs for update using (auth.uid() = user_id);
create policy "energy_tariffs_delete_own" on public.energy_tariffs for delete using (auth.uid() = user_id);

-- tariff_rate_periods has no user_id column directly; scope via the parent tariff.
create policy "tariff_rate_periods_select_own" on public.tariff_rate_periods for select
  using (exists (select 1 from public.energy_tariffs t where t.id = tariff_id and t.user_id = auth.uid()));
create policy "tariff_rate_periods_insert_own" on public.tariff_rate_periods for insert
  with check (exists (select 1 from public.energy_tariffs t where t.id = tariff_id and t.user_id = auth.uid()));
create policy "tariff_rate_periods_update_own" on public.tariff_rate_periods for update
  using (exists (select 1 from public.energy_tariffs t where t.id = tariff_id and t.user_id = auth.uid()));
create policy "tariff_rate_periods_delete_own" on public.tariff_rate_periods for delete
  using (exists (select 1 from public.energy_tariffs t where t.id = tariff_id and t.user_id = auth.uid()));

create policy "electricity_bills_select_own" on public.electricity_bills for select using (auth.uid() = user_id);
create policy "electricity_bills_insert_own" on public.electricity_bills for insert with check (auth.uid() = user_id);
create policy "electricity_bills_update_own" on public.electricity_bills for update using (auth.uid() = user_id);
create policy "electricity_bills_delete_own" on public.electricity_bills for delete using (auth.uid() = user_id);

create policy "charging_sessions_select_own" on public.charging_sessions for select using (auth.uid() = user_id);
create policy "charging_sessions_insert_own" on public.charging_sessions for insert with check (auth.uid() = user_id);
create policy "charging_sessions_update_own" on public.charging_sessions for update using (auth.uid() = user_id);
create policy "charging_sessions_delete_own" on public.charging_sessions for delete using (auth.uid() = user_id);

create policy "trips_select_own" on public.trips for select using (auth.uid() = user_id);
create policy "trips_insert_own" on public.trips for insert with check (auth.uid() = user_id);
create policy "trips_update_own" on public.trips for update using (auth.uid() = user_id);
create policy "trips_delete_own" on public.trips for delete using (auth.uid() = user_id);

create policy "raw_imports_select_own" on public.raw_imports for select using (auth.uid() = user_id);
create policy "raw_imports_insert_own" on public.raw_imports for insert with check (auth.uid() = user_id);
create policy "raw_imports_update_own" on public.raw_imports for update using (auth.uid() = user_id);
create policy "raw_imports_delete_own" on public.raw_imports for delete using (auth.uid() = user_id);
