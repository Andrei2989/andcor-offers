ALTER TABLE catalog_items ADD COLUMN category text NOT NULL DEFAULT '';
CREATE INDEX catalog_items_category_idx ON catalog_items (category);

CREATE OR REPLACE FUNCTION upsert_catalog_items(p_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  item      jsonb;
  v_name    text;
  v_ref     text;
  v_code    text;
  v_unit    text;
  v_price   numeric;
  v_cat     text;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_name  := coalesce(nullif(trim(item->>'name'),  ''), '');
    v_ref   := coalesce(nullif(trim(item->>'manufacturer_ref'), ''), '');
    v_code  := coalesce(nullif(trim(item->>'part_code'), ''), '');
    v_unit  := coalesce(nullif(trim(item->>'unit'),  ''), 'buc');
    v_price := coalesce((item->>'purchase_price')::numeric, 0);
    v_cat   := coalesce(nullif(trim(item->>'category'), ''), '');

    IF v_name = '' AND v_ref = '' THEN CONTINUE; END IF;

    IF v_ref <> '' THEN
      INSERT INTO catalog_items (name, manufacturer_ref, part_code, unit, purchase_price, category)
      VALUES (v_name, v_ref, v_code, v_unit, v_price, v_cat)
      ON CONFLICT (manufacturer_ref) WHERE manufacturer_ref <> ''
      DO UPDATE SET
        name           = EXCLUDED.name,
        part_code      = EXCLUDED.part_code,
        unit           = EXCLUDED.unit,
        purchase_price = CASE WHEN EXCLUDED.purchase_price > 0 THEN EXCLUDED.purchase_price ELSE catalog_items.purchase_price END,
        category       = CASE WHEN EXCLUDED.category <> '' THEN EXCLUDED.category ELSE catalog_items.category END,
        use_count      = catalog_items.use_count + 1,
        last_used_at   = now();
    ELSE
      INSERT INTO catalog_items (name, manufacturer_ref, part_code, unit, purchase_price, category)
      VALUES (v_name, v_ref, v_code, v_unit, v_price, v_cat)
      ON CONFLICT (name, part_code) WHERE manufacturer_ref = ''
      DO UPDATE SET
        unit           = EXCLUDED.unit,
        purchase_price = CASE WHEN EXCLUDED.purchase_price > 0 THEN EXCLUDED.purchase_price ELSE catalog_items.purchase_price END,
        category       = CASE WHEN EXCLUDED.category <> '' THEN EXCLUDED.category ELSE catalog_items.category END,
        use_count      = catalog_items.use_count + 1,
        last_used_at   = now();
    END IF;
  END LOOP;
END$$;
