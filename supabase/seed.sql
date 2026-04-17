-- Seed: company settings + reference offer ADV1524198.
-- Idempotent — safe to re-run during development.

-- Fixed UUID for the reference offer so re-seeds replace deterministically.
do $$
declare
  ref_offer_id uuid := '00000000-0000-0000-0000-000000001198';
  g1_id uuid := '00000000-0000-0000-0000-0000000011a1';
  g2_id uuid := '00000000-0000-0000-0000-0000000011a2';
begin
  -- Company
  insert into company_settings (
    company_name, cif, reg_number, address, phone, email,
    bank_account, bank_name,
    default_validity_days, default_delivery_days, default_warranty_months
  ) values (
    'ANDCOR AUTO SRL',
    'RO42820863',
    'EUID ROONRC.J2020008572404',
    'Str. Câmpineanca nr. 8, Sector 3, București',
    '0726.425.618',
    'corina@andcorauto.com',
    'RO02TREZ7035069XXX024484',
    'Trezorerie',
    60, 5, 12
  )
  on conflict (singleton) do update set
    company_name = excluded.company_name,
    cif = excluded.cif,
    reg_number = excluded.reg_number,
    address = excluded.address,
    phone = excluded.phone,
    email = excluded.email,
    bank_account = excluded.bank_account,
    bank_name = excluded.bank_name;

  -- Reference offer — delete children first (cascade via group delete)
  delete from offer_groups where offer_id = ref_offer_id;

  insert into offers (id, offer_number, issue_date, validity_days, delivery_days,
                      delivery_unit, warranty_months, transport, payment_method, status)
  values (ref_offer_id, 'ADV1524198', date '2026-04-17', 60, 5,
          'zile lucrătoare', 12, 'Gratuit', 'Ordin de plată', 'sent')
  on conflict (offer_number) do update set
    id = excluded.id,
    issue_date = excluded.issue_date,
    validity_days = excluded.validity_days,
    delivery_days = excluded.delivery_days,
    delivery_unit = excluded.delivery_unit,
    warranty_months = excluded.warranty_months,
    transport = excluded.transport,
    payment_method = excluded.payment_method,
    status = excluded.status;

  insert into offer_groups (id, offer_id, title, sort_order) values
    (g1_id, ref_offer_id, 'Grupa 1 - Piese de direcție și frână (ansamblu)', 0),
    (g2_id, ref_offer_id, 'Grupa 2 - Piese de frână și consumabile', 1);

  insert into offer_items (group_id, sort_order, name, manufacturer_ref, part_code, unit, quantity, unit_price) values
    (g1_id, 0, 'Bară transversală direcție Iveco 6x6', '5801692438', '5801692438', 'buc', 1, 2950),
    (g1_id, 1, 'Bară longitudinală direcție Iveco 6x6', '98165176', '98165176', 'buc', 1, 3700),
    (g1_id, 2, 'Cilindru principal frână', '03.3138-2001.3', '03.3138-2001.3', 'buc', 20, 1150),
    (g2_id, 0, 'Set plăcuțe frână', '500086031', '130044 / E-truck', 'buc', 60, 175),
    (g2_id, 1, 'Etanșare piston cuplare 6x6', '46393066', '46393066', 'buc', 15, 115),
    (g2_id, 2, 'Set reparație etrier', '98120043', '98120043', 'buc', 32, 2500),
    (g2_id, 3, 'Ulei instalație frânare', 'NHTSA116-DOT4 SAE J1703', 'PFB401SE / TRW', 'l', 50, 33);
end $$;
