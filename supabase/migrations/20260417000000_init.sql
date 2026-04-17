-- ANDCOR AUTO — offer app initial schema
-- Enums
create type offer_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');

-- Offer number: "ADV" + 7-digit sequential.
-- Starts at 1524199 so the seeded reference (ADV1524198) is preserved.
create sequence offer_number_seq start 1524199;

create or replace function next_offer_number() returns text
language sql volatile as $$
  select 'ADV' || lpad(nextval('offer_number_seq')::text, 7, '0');
$$;

-- ---------- company_settings ----------
-- Singleton: unique(singleton=true) constraint enforces exactly one row.
create table company_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  company_name text not null,
  cif text not null,
  reg_number text not null,
  address text not null,
  phone text,
  email text,
  bank_account text,
  bank_name text,
  logo_url text,
  iveco_logo_url text,
  iso_logo_url text,
  default_validity_days int not null default 60,
  default_delivery_days int not null default 5,
  default_warranty_months int not null default 12,
  updated_at timestamptz not null default now()
);

-- ---------- offers ----------
create table offers (
  id uuid primary key default gen_random_uuid(),
  offer_number text unique not null default next_offer_number(),
  issue_date date not null default current_date,
  validity_days int not null default 60,
  valid_until date generated always as (issue_date + validity_days) stored,
  delivery_days int not null default 5,
  delivery_unit text not null default 'zile lucrătoare',
  warranty_months int not null default 12,
  transport text not null default 'Gratuit',
  payment_method text not null default 'Ordin de plată',
  client_name text,
  client_cif text,
  client_address text,
  notes text,
  status offer_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index offers_status_idx on offers (status);
create index offers_issue_date_idx on offers (issue_date desc);
create index offers_client_name_idx on offers (client_name);

-- ---------- offer_groups ----------
create table offer_groups (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  title text not null,
  sort_order int not null default 0
);
create index offer_groups_offer_idx on offer_groups (offer_id, sort_order);

-- ---------- offer_items ----------
create table offer_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references offer_groups(id) on delete cascade,
  sort_order int not null default 0,
  name text not null default '',
  manufacturer_ref text not null default '',
  part_code text not null default '',
  unit text not null default 'buc',
  quantity numeric(12,3) not null default 1,
  unit_price numeric(14,2) not null default 0
);
create index offer_items_group_idx on offer_items (group_id, sort_order);

-- ---------- updated_at trigger ----------
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger offers_touch before update on offers
  for each row execute function touch_updated_at();
create trigger company_settings_touch before update on company_settings
  for each row execute function touch_updated_at();

-- ---------- RPC: save_offer ----------
-- Replaces the groups + items for an existing offer atomically.
-- Payload shape:
-- {
--   "meta": { "issue_date":..., "validity_days":..., ... },
--   "client": { "name":..., "cif":..., "address":... },
--   "notes": "...",
--   "status": "draft" (optional),
--   "groups": [
--     { "id":uuid?, "title":..., "sort_order":0, "items": [
--         { "sort_order":0, "name":..., "manufacturer_ref":..., "part_code":...,
--           "unit":..., "quantity":..., "unit_price":... }
--       ]}
--   ]
-- }
create or replace function save_offer(p_offer_id uuid, p_payload jsonb)
returns offers language plpgsql security invoker as $$
declare r offers;
begin
  update offers set
    issue_date      = coalesce((p_payload->'meta'->>'issue_date')::date, issue_date),
    validity_days   = coalesce((p_payload->'meta'->>'validity_days')::int, validity_days),
    delivery_days   = coalesce((p_payload->'meta'->>'delivery_days')::int, delivery_days),
    delivery_unit   = coalesce(p_payload->'meta'->>'delivery_unit', delivery_unit),
    warranty_months = coalesce((p_payload->'meta'->>'warranty_months')::int, warranty_months),
    transport       = coalesce(p_payload->'meta'->>'transport', transport),
    payment_method  = coalesce(p_payload->'meta'->>'payment_method', payment_method),
    client_name     = p_payload->'client'->>'name',
    client_cif      = p_payload->'client'->>'cif',
    client_address  = p_payload->'client'->>'address',
    notes           = p_payload->>'notes',
    status          = coalesce((p_payload->>'status')::offer_status, status)
  where id = p_offer_id
  returning * into r;

  if r.id is null then
    raise exception 'offer % not found', p_offer_id;
  end if;

  -- Replace groups + cascaded items
  delete from offer_groups where offer_id = p_offer_id;

  with inserted_groups as (
    insert into offer_groups (id, offer_id, title, sort_order)
    select coalesce((g->>'id')::uuid, gen_random_uuid()),
           p_offer_id,
           g->>'title',
           coalesce((g->>'sort_order')::int, 0)
    from jsonb_array_elements(coalesce(p_payload->'groups', '[]'::jsonb)) with ordinality as t(g, ord)
    returning id, sort_order
  )
  insert into offer_items (group_id, sort_order, name, manufacturer_ref, part_code, unit, quantity, unit_price)
  select ig.id,
         coalesce((i->>'sort_order')::int, 0),
         coalesce(i->>'name', ''),
         coalesce(i->>'manufacturer_ref', ''),
         coalesce(i->>'part_code', ''),
         coalesce(i->>'unit', 'buc'),
         coalesce((i->>'quantity')::numeric, 0),
         coalesce((i->>'unit_price')::numeric, 0)
  from jsonb_array_elements(coalesce(p_payload->'groups', '[]'::jsonb)) with ordinality as g(gval, gord)
  join inserted_groups ig on ig.sort_order = coalesce((g.gval->>'sort_order')::int, g.gord::int - 1)
  cross join lateral jsonb_array_elements(coalesce(g.gval->'items', '[]'::jsonb)) as i;

  return r;
end$$;

-- ---------- RPC: duplicate_offer ----------
create or replace function duplicate_offer(src_id uuid)
returns uuid language plpgsql security invoker as $$
declare new_id uuid;
begin
  insert into offers (issue_date, validity_days, delivery_days, delivery_unit,
                      warranty_months, transport, payment_method,
                      client_name, client_cif, client_address, notes, status)
  select current_date, validity_days, delivery_days, delivery_unit,
         warranty_months, transport, payment_method,
         client_name, client_cif, client_address, notes, 'draft'::offer_status
  from offers where id = src_id
  returning id into new_id;

  if new_id is null then
    raise exception 'source offer % not found', src_id;
  end if;

  with src_groups as (
    select id, title, sort_order
    from offer_groups
    where offer_id = src_id
  ),
  new_groups as (
    insert into offer_groups (offer_id, title, sort_order)
    select new_id, title, sort_order from src_groups
    returning id, sort_order
  ),
  group_map as (
    select sg.id as src_id, ng.id as new_id
    from src_groups sg
    join new_groups ng on ng.sort_order = sg.sort_order
  )
  insert into offer_items (group_id, sort_order, name, manufacturer_ref,
                           part_code, unit, quantity, unit_price)
  select gm.new_id, oi.sort_order, oi.name, oi.manufacturer_ref,
         oi.part_code, oi.unit, oi.quantity, oi.unit_price
  from offer_items oi
  join group_map gm on gm.src_id = oi.group_id;

  return new_id;
end$$;

-- ---------- offers_with_total view (for list page) ----------
create or replace view offers_with_total as
  select o.*,
    coalesce((
      select sum(i.quantity * i.unit_price)
      from offer_items i
      join offer_groups g on g.id = i.group_id
      where g.offer_id = o.id
    ), 0)::numeric(16,2) as total
  from offers o;

-- ---------- RLS ----------
alter table company_settings enable row level security;
alter table offers enable row level security;
alter table offer_groups enable row level security;
alter table offer_items enable row level security;

create policy "authenticated rw" on company_settings
  for all to authenticated using (true) with check (true);
create policy "authenticated rw" on offers
  for all to authenticated using (true) with check (true);
create policy "authenticated rw" on offer_groups
  for all to authenticated using (true) with check (true);
create policy "authenticated rw" on offer_items
  for all to authenticated using (true) with check (true);

-- ---------- Storage bucket for logos ----------
insert into storage.buckets (id, name, public)
  values ('logos', 'logos', true)
  on conflict (id) do nothing;

create policy "public read logos" on storage.objects
  for select using (bucket_id = 'logos');
create policy "authenticated insert logos" on storage.objects
  for insert to authenticated with check (bucket_id = 'logos');
create policy "authenticated update logos" on storage.objects
  for update to authenticated using (bucket_id = 'logos');
create policy "authenticated delete logos" on storage.objects
  for delete to authenticated using (bucket_id = 'logos');
