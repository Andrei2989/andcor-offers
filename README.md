# ANDCOR AUTO — Offer Generator

Web app for ANDCOR AUTO SRL to create, save, edit, and export price offers (Oferte de Preț) as PDFs. Replaces the Excel-based workflow with a fast form UI, live PDF preview, and Supabase-backed storage.

## Tech

- **Frontend**: Vite + React 18 + TypeScript, Tailwind CSS, React Router v6, TanStack Query
- **PDF**: `@react-pdf/renderer` with Inter font for full Romanian diacritic support
- **Backend**: Supabase (Postgres + Auth + Storage + RLS)
- **Deploy**: Vercel (frontend), Supabase cloud (backend)

## Local setup

### 1. Prerequisites
- Node.js 20+
- A fresh Supabase project (https://supabase.com/dashboard → New project)
- The Supabase CLI (optional, for local DB): `npm i -g supabase`

### 2. Install
```bash
npm install
```

### 3. Supabase schema + seed

On the new Supabase project → **SQL Editor** → paste and run:

1. `supabase/migrations/20260417000000_init.sql` — creates tables, RPCs, RLS policies, storage bucket.
2. `supabase/seed.sql` — inserts the ANDCOR company row + the reference offer `ADV1524198` with its 2 groups and 7 items.

Then create your login user in **Authentication → Users → Add user**.

### 4. Env vars

Copy `.env.example` → `.env.local` and fill in:
```
VITE_SUPABASE_URL=<your supabase project url>
VITE_SUPABASE_ANON_KEY=<your anon/public key>
```

### 5. Upload logos (one-time)

The app ships with pre-cropped logos in `public/logos/` (extracted from the source Excel). Upload them to Supabase Storage via the Settings page once you're logged in, or use the Supabase dashboard → Storage → `logos` bucket and update the `logo_url / iveco_logo_url / iso_logo_url` columns in `company_settings`.

### 6. Run
```bash
npm run dev
```

Visit http://localhost:5173. Log in with the user you created.

**Shortcut**: if Supabase isn't wired yet, open http://localhost:5173/dev/pdf for a live PDF preview of the seeded reference offer — this works without any backend.

## Commands

| | |
|---|---|
| `npm run dev` | start Vite dev server |
| `npm run build` | type-check + production bundle |
| `npm run preview` | serve the production bundle locally |
| `npm run test` | run vitest suite (formatters, totals, PDF smoke) |
| `npm run typecheck` | tsc –noEmit |
| `npx tsx scripts/render-pdf.tsx /tmp/out.pdf` | render the seed offer to PDF for visual diff against `Oferta_ADV1524198.pdf` |
| `npx tsx scripts/extract-logos.ts` | re-crop the 3 logos from the xlsx composite (requires `/tmp/xlsx_logo.png`) |

## PDF pixel-parity check

After any PDF section edit:
```bash
npx tsx scripts/render-pdf.tsx /tmp/generated.pdf
# Open /tmp/generated.pdf and Oferta_ADV1524198.pdf side-by-side. Spot-check:
# - diacritics (ă â î ș ț) render in every section
# - numbers use "29.650" thousands and "29.650,75" decimals
# - "RON" never line-wraps (we use NBSP)
# - tables use navy header, alternating body rows, bold navy Valoare column
# - footer shows "Pagina 1" on single-page offers
```

Optional automated raster diff:
```bash
pdftoppm -r 200 /tmp/generated.pdf gen && pdftoppm -r 200 Oferta_ADV1524198.pdf ref
compare -metric AE gen-1.ppm ref-1.ppm diff.ppm
```

## Deploy

### Supabase (already done in setup)
Run the migration + seed on your Supabase project as in step 3 above.

### Vercel
1. Push this repo to GitHub (standalone — do NOT reuse any existing project's repo).
2. Vercel dashboard → **New Project** → import the repo.
3. Framework: `Vite`. Build command: `npm run build`. Output: `dist`.
4. Environment variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy.

`vercel.json` already rewrites all routes to `index.html` for SPA client-side routing.

## Data model

| Table | Notes |
|---|---|
| `company_settings` | Singleton row — company info, logos, defaults |
| `offers` | Root offer record. `offer_number` auto via `next_offer_number()` (`ADV` + 7 digits) |
| `offer_groups` | 1-N groups per offer, each with an editable title + sort_order |
| `offer_items` | 1-N line items per group |
| `offers_with_total` | View: offers + summed total, used by the list page |

Totals are **never stored** — they're computed in code (`src/lib/totals.ts`) and in the `offers_with_total` view. This prevents drift between UI, PDF, and DB.

RPCs:
- `save_offer(offer_id, payload jsonb)` — atomic replace of all groups+items for one offer
- `duplicate_offer(src_id)` — clones an offer with new number + today's date + status draft

## File map

```
supabase/migrations/   SQL schema + RPCs + RLS
supabase/seed.sql      Reference offer + company row
public/fonts/          Inter (Regular/Medium/SemiBold/Bold) — full Romanian coverage
public/logos/          ANDCOR / IVECO / ISO 9001 seal
scripts/               Dev utilities (extract-logos, render-pdf)
src/pdf/               PDF document + theme + per-section components
src/components/editor/ Form cards, inline ItemRow with dnd-kit drag handles
src/pages/             OffersList, OfferEditor, Settings, Login, DevPdf
src/lib/               supabase client, format.ts (RO locale), totals.ts, queries.ts, viewmodel.ts
src/hooks/             useAuth, useOfferEditor (reducer + autosave + localStorage mirror)
```

## Editor behavior

- **Autosave**: 500ms debounce after last keystroke + 5s floor. Indicator shows "Saving…" / "Saved 12s ago" / "Error" with retry.
- **Unload guard**: `beforeunload` blocks tab close while the offer is dirty or a save is in flight.
- **localStorage mirror**: editor state is mirrored to `offer:<id>` on every dispatch so work survives a network failure.
- **Drag reorder**: items reorderable within a group via the `#` column (drag handle). Group-level reorder wired but intentionally no handle — not needed for typical use.
- **Romanian number input**: `NumberInput` accepts `29.650,75` or `29650.75` or `29,650.75`, displays formatted `29.650,75` when blurred, raw digits when focused.
- **Enter on last item field** adds a new row + focuses its name input.

## Known scope exclusions (Phase 2)

- "Send via email" — current build is Download-PDF-only. Add Resend + Vercel edge function later.
- Excel import.
- `source_url` per item (clickable part-code links).
- Multi-user permissions / tenancy.
