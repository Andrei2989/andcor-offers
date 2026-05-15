-- Tabel catalog piese
CREATE TABLE catalog_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL DEFAULT '',
  manufacturer_ref text       NOT NULL DEFAULT '',
  part_code       text        NOT NULL DEFAULT '',
  unit            text        NOT NULL DEFAULT 'buc',
  purchase_price  numeric     NOT NULL DEFAULT 0,
  use_count       integer     NOT NULL DEFAULT 1,
  last_used_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Unique pe manufacturer_ref cand e completat
CREATE UNIQUE INDEX catalog_items_ref_idx
  ON catalog_items (manufacturer_ref)
  WHERE manufacturer_ref <> '';

-- Unique pe (name, part_code) cand manufacturer_ref e gol
CREATE UNIQUE INDEX catalog_items_name_code_idx
  ON catalog_items (name, part_code)
  WHERE manufacturer_ref = '';

-- RLS
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated rw" ON catalog_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Functie upsert apelata la fiecare salvare de oferta
CREATE OR REPLACE FUNCTION upsert_catalog_items(p_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  item     jsonb;
  v_name   text;
  v_ref    text;
  v_code   text;
  v_unit   text;
  v_price  numeric;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_name  := coalesce(nullif(trim(item->>'name'),  ''), '');
    v_ref   := coalesce(nullif(trim(item->>'manufacturer_ref'), ''), '');
    v_code  := coalesce(nullif(trim(item->>'part_code'), ''), '');
    v_unit  := coalesce(nullif(trim(item->>'unit'),  ''), 'buc');
    v_price := coalesce((item->>'purchase_price')::numeric, 0);

    IF v_name = '' AND v_ref = '' THEN CONTINUE; END IF;

    IF v_ref <> '' THEN
      INSERT INTO catalog_items (name, manufacturer_ref, part_code, unit, purchase_price)
      VALUES (v_name, v_ref, v_code, v_unit, v_price)
      ON CONFLICT (manufacturer_ref) WHERE manufacturer_ref <> ''
      DO UPDATE SET
        name            = EXCLUDED.name,
        part_code       = EXCLUDED.part_code,
        unit            = EXCLUDED.unit,
        purchase_price  = CASE WHEN EXCLUDED.purchase_price > 0
                               THEN EXCLUDED.purchase_price
                               ELSE catalog_items.purchase_price END,
        use_count       = catalog_items.use_count + 1,
        last_used_at    = now();
    ELSE
      INSERT INTO catalog_items (name, manufacturer_ref, part_code, unit, purchase_price)
      VALUES (v_name, v_ref, v_code, v_unit, v_price)
      ON CONFLICT (name, part_code) WHERE manufacturer_ref = ''
      DO UPDATE SET
        unit            = EXCLUDED.unit,
        purchase_price  = CASE WHEN EXCLUDED.purchase_price > 0
                               THEN EXCLUDED.purchase_price
                               ELSE catalog_items.purchase_price END,
        use_count       = catalog_items.use_count + 1,
        last_used_at    = now();
    END IF;
  END LOOP;
END$$;
