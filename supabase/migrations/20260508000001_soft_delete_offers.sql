-- Add soft-delete column to offers
alter table offers add column if not exists deleted_at timestamptz default null;

-- Drop and recreate views to pick up new column
drop view if exists offers_with_total;
drop view if exists deleted_offers_with_total;

-- Main list view excludes soft-deleted rows
create view offers_with_total as
  select o.*,
    coalesce((
      select sum(i.quantity * i.unit_price)
      from offer_items i
      join offer_groups g on g.id = i.group_id
      where g.offer_id = o.id
    ), 0)::numeric(16,2) as total
  from offers o
  where o.deleted_at is null;

-- Trash view shows only soft-deleted rows
create view deleted_offers_with_total as
  select o.*,
    coalesce((
      select sum(i.quantity * i.unit_price)
      from offer_items i
      join offer_groups g on g.id = i.group_id
      where g.offer_id = o.id
    ), 0)::numeric(16,2) as total
  from offers o
  where o.deleted_at is not null
  order by o.deleted_at desc;
