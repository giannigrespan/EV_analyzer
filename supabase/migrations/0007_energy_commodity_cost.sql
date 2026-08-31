-- Octopus Go bills break the "materia energia" (energy commodity) spend out
-- as its own "Altre partite" line, separate from network charges, system
-- costs, and taxes. Storing it lets reconciliation compute a real €/kWh for
-- EV charging (materia energia ÷ kWh actually charged), which - for a user
-- who charges almost entirely off-peak - is a much closer match to the
-- Octopus Go rate than dividing the bill's grand total by its total kWh.
alter table public.electricity_bills
  add column if not exists energy_commodity_cost numeric;
