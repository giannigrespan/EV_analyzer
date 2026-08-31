-- The Wallbox export splits delivered energy into grid vs solar; only the
-- grid-drawn portion is billable at the tariff rate, so it needs its own
-- column distinct from the total energy delivered to the car.
alter table public.charging_sessions
  add column if not exists grid_energy_kwh numeric;
