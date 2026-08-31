-- The user is on an Italian (EUR) energy tariff, not GBP.
alter table public.energy_tariffs alter column currency set default 'EUR';
update public.energy_tariffs set currency = 'EUR' where currency = 'GBP';
