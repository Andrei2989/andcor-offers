-- Fix save_offer RPC: offer_number was missing from the UPDATE statement,
-- causing the field to never be persisted after initial draft creation.
create or replace function save_offer(p_offer_id uuid, p_payload jsonb)
returns offers language plpgsql security invoker as $$
declare r offers;
begin
  update offers set
    offer_number    = coalesce(nullif(p_payload->>'offer_number', ''), offer_number),
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
