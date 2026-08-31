-- Replace the UK-style Octopus Go night window (00:30-05:30) seeded before
-- we knew the real Italian tariff uses ARERA F1/F2/F3 bands, with a
-- 2-band approximation: night 23:00-07:00 as off_peak, day 07:00-23:00 as
-- standard. Only touches rows still at their untouched seeded defaults
-- (price 0), so any tariff the user has already customized is left alone.
update public.tariff_rate_periods
set time_start = '23:00', time_end = '07:00'
where rate_name = 'off_peak'
  and time_start = '00:30:00'
  and time_end = '05:30:00'
  and price_per_kwh = 0;

update public.tariff_rate_periods
set time_start = '07:00', time_end = '23:00'
where rate_name = 'standard'
  and time_start = '05:30:00'
  and time_end = '00:30:00'
  and price_per_kwh = 0;
