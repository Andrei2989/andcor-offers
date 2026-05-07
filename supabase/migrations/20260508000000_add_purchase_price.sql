-- Add purchase_price column to offer_items
alter table offer_items
  add column purchase_price numeric(14,2) not null default 0;

-- Update save_offer RPC to include purchase_price
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
  insert into offer_items (group_id, sort_order, name, manufacturer_ref, part_code, unit, quantity, unit_price, purchase_price)
  select ig.id,
         coalesce((i->>'sort_order')::int, 0),
         coalesce(i->>'name', ''),
         coalesce(i->>'manufacturer_ref', ''),
         coalesce(i->>'part_code', ''),
         coalesce(i->>'unit', 'buc'),
         coalesce((i->>'quantity')::numeric, 0),
         coalesce((i->>'unit_price')::numeric, 0),
         coalesce((i->>'purchase_price')::numeric, 0)
  from jsonb_array_elements(coalesce(p_payload->'groups', '[]'::jsonb)) with ordinality as g(gval, gord)
  join inserted_groups ig on ig.sort_order = coalesce((g.gval->>'sort_order')::int, g.gord::int - 1)
  cross join lateral jsonb_array_elements(coalesce(g.gval->'items', '[]'::jsonb)) as i;

  return r;
end$$;

-- Update duplicate_offer RPC to include purchase_price
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
                           part_code, unit, quantity, unit_price, purchase_price)
  select gm.new_id, oi.sort_order, oi.name, oi.manufacturer_ref,
         oi.part_code, oi.unit, oi.quantity, oi.unit_price, oi.purchase_price
  from offer_items oi
  join group_map gm on gm.src_id = oi.group_id;

  return new_id;
end$$;
