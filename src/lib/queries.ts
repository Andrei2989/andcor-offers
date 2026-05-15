import { supabase } from './supabase';
import type {
  CatalogItem,
  CompanySettings,
  OfferEditorState,
  OfferGroup,
  OfferGroupRow,
  OfferItemRow,
  OfferRow,
  OfferStatus,
  OfferWithTotal,
} from '@/types/db';

export const keys = {
  company: ['company_settings'] as const,
  offers: (filters?: OfferListFilters) => ['offers', filters] as const,
  offer: (id: string) => ['offer', id] as const,
};

export interface OfferListFilters {
  status?: OfferStatus[];
  clientSearch?: string;
  clientExact?: string;
  from?: string;
  to?: string;
}

export async function fetchCompany(): Promise<CompanySettings | null> {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertCompany(patch: Partial<CompanySettings>): Promise<CompanySettings> {
  const { data, error } = await supabase
    .from('company_settings')
    .upsert({ ...patch, singleton: true }, { onConflict: 'singleton' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function fetchOffers(filters: OfferListFilters = {}): Promise<OfferWithTotal[]> {
  let q = supabase.from('offers_with_total').select('*').order('issue_date', { ascending: false });
  if (filters.status?.length) q = q.in('status', filters.status);
  if (filters.clientExact) q = q.eq('client_name', filters.clientExact);
  else if (filters.clientSearch?.trim())
    q = q.ilike('client_name', `%${filters.clientSearch.trim()}%`);
  if (filters.from) q = q.gte('issue_date', filters.from);
  if (filters.to) q = q.lte('issue_date', filters.to);
  const { data, error } = await q;
  if (error) throw error;
  return data as OfferWithTotal[];
}

export async function fetchOfferEditor(id: string): Promise<OfferEditorState> {
  const [{ data: offer, error: e1 }, { data: groups, error: e2 }, { data: items, error: e3 }] =
    await Promise.all([
      supabase.from('offers').select('*').eq('id', id).is('deleted_at', null).single(),
      supabase.from('offer_groups').select('*').eq('offer_id', id).order('sort_order'),
      supabase
        .from('offer_items')
        .select('*, offer_groups!inner(offer_id)')
        .eq('offer_groups.offer_id', id)
        .order('sort_order'),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  return composeEditor(offer as OfferRow, groups as OfferGroupRow[], items as OfferItemRow[]);
}

function composeEditor(
  offer: OfferRow,
  groups: OfferGroupRow[],
  items: OfferItemRow[]
): OfferEditorState {
  const byGroup = new Map<string, OfferGroup>();
  for (const g of groups) {
    byGroup.set(g.id, {
      id: g.id,
      title: g.title,
      sort_order: g.sort_order,
      items: [],
    });
  }
  for (const i of items) {
    const g = byGroup.get(i.group_id);
    if (!g) continue;
    g.items.push({
      id: i.id,
      sort_order: i.sort_order,
      name: i.name,
      manufacturer_ref: i.manufacturer_ref,
      part_code: i.part_code,
      unit: i.unit,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      purchase_price: Number(i.purchase_price ?? 0),
    });
  }
  const orderedGroups = [...byGroup.values()]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((g) => ({ ...g, items: g.items.sort((a, b) => a.sort_order - b.sort_order) }));

  return {
    id: offer.id,
    offer_number: offer.offer_number,
    issue_date: offer.issue_date,
    validity_days: offer.validity_days,
    delivery_days: offer.delivery_days,
    delivery_unit: offer.delivery_unit,
    warranty_months: offer.warranty_months,
    transport: offer.transport,
    payment_method: offer.payment_method,
    client_name: offer.client_name ?? '',
    client_cif: offer.client_cif ?? '',
    client_address: offer.client_address ?? '',
    notes: offer.notes ?? '',
    status: offer.status,
    groups: orderedGroups,
    updated_at: offer.updated_at,
  };
}

export async function createDraftOffer(): Promise<string> {
  // Insert a row with defaults — Postgres populates offer_number from the sequence.
  // A default first group is seeded so the editor opens with something editable.
  const { data: offer, error } = await supabase
    .from('offers')
    .insert({})
    .select('id')
    .single();
  if (error) throw error;
  const { error: e2 } = await supabase
    .from('offer_groups')
    .insert({ offer_id: offer.id, title: 'Grupa 1', sort_order: 0 });
  if (e2) throw e2;
  return offer.id as string;
}

export async function saveOfferRpc(state: OfferEditorState): Promise<void> {
  const payload = {
    offer_number: state.offer_number,
    meta: {
      issue_date: state.issue_date,
      validity_days: state.validity_days,
      delivery_days: state.delivery_days,
      delivery_unit: state.delivery_unit,
      warranty_months: state.warranty_months,
      transport: state.transport,
      payment_method: state.payment_method,
    },
    client: {
      name: state.client_name || null,
      cif: state.client_cif || null,
      address: state.client_address || null,
    },
    notes: state.notes || null,
    status: state.status,
    groups: state.groups.map((g, gi) => ({
      id: g.id.startsWith('tmp-') ? null : g.id,
      title: g.title,
      sort_order: gi,
      items: g.items.map((it, ii) => ({
        sort_order: ii,
        name: it.name,
        manufacturer_ref: it.manufacturer_ref,
        part_code: it.part_code,
        unit: it.unit,
        quantity: it.quantity,
        unit_price: it.unit_price,
        purchase_price: it.purchase_price,
      })),
    })),
  };
  const { error } = await supabase.rpc('save_offer', {
    p_offer_id: state.id,
    p_payload: payload,
  });
  if (error) throw error;

  // Upsert catalog — fire and forget, nu blocheaza salvarea
  const catalogItems = state.groups.flatMap((g) =>
    g.items.map((it) => ({
      name: it.name,
      manufacturer_ref: it.manufacturer_ref,
      part_code: it.part_code,
      unit: it.unit,
      purchase_price: it.purchase_price,
      category: detectCategory(g.title, it.name, it.manufacturer_ref),
    }))
  );
  upsertCatalogItems(catalogItems).catch(() => {});
}

export interface ClientEntry {
  client_name: string;
  client_cif: string;
  client_address: string;
}

export async function fetchClientList(): Promise<ClientEntry[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('client_name, client_cif, client_address')
    .is('deleted_at', null)
    .not('client_name', 'is', null)
    .neq('client_name', '')
    .order('client_name');
  if (error) throw error;

  // Deduplicate by client_name, keeping the most recent entry's cif/address
  const seen = new Map<string, ClientEntry>();
  for (const row of (data ?? []) as ClientEntry[]) {
    if (!seen.has(row.client_name)) {
      seen.set(row.client_name, {
        client_name: row.client_name,
        client_cif: row.client_cif ?? '',
        client_address: row.client_address ?? '',
      });
    }
  }
  return [...seen.values()];
}

export async function patchOfferStatus(id: string, status: OfferStatus): Promise<void> {
  const { error } = await supabase.from('offers').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function duplicateOfferRpc(srcId: string): Promise<string> {
  const { data, error } = await supabase.rpc('duplicate_offer', { src_id: srcId });
  if (error) throw error;
  return data as string;
}

export async function deleteOffer(id: string): Promise<void> {
  const { error } = await supabase
    .from('offers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function restoreOffer(id: string): Promise<void> {
  const { error } = await supabase
    .from('offers')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw error;
}

export async function permanentDeleteOffer(id: string): Promise<void> {
  const { error } = await supabase.from('offers').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchDeletedOffers(): Promise<OfferWithTotal[]> {
  const { data, error } = await supabase
    .from('deleted_offers_with_total')
    .select('*');
  if (error) throw error;
  return data as OfferWithTotal[];
}

// ---------- Catalog ----------

const BRAND_KEYWORDS: [RegExp, string][] = [
  [/dacia/i, 'Dacia'],
  [/iveco/i, 'Iveco'],
  [/\btab\b/i, 'TAB'],
  [/renault/i, 'Renault'],
  [/\bford\b/i, 'Ford'],
  [/volkswagen|\bvw\b/i, 'Volkswagen'],
  [/\bbmw\b/i, 'BMW'],
  [/mercedes/i, 'Mercedes'],
  [/\bopel\b/i, 'Opel'],
  [/toyota/i, 'Toyota'],
  [/hyundai/i, 'Hyundai'],
  [/\bkia\b/i, 'Kia'],
  [/peugeot/i, 'Peugeot'],
  [/citroen|citroën/i, 'Citroën'],
  [/\bfiat\b/i, 'Fiat'],
  [/skoda|škoda/i, 'Škoda'],
  [/\baudi\b/i, 'Audi'],
  [/volvo/i, 'Volvo'],
  [/\blada\b/i, 'Lada'],
];

// Prefixe VIN (WMI — primele 3 caractere) → marcă
const VIN_WMI: [RegExp, string][] = [
  [/^UU1/i, 'Dacia'],         // Dacia Romania
  [/^WJM/i, 'Iveco'],         // Iveco Italia
  [/^WVW|^WV1|^WV2/i, 'Volkswagen'],
  [/^W0L/i, 'Opel'],
  [/^WBA|^WBS|^WBY/i, 'BMW'],
  [/^WDB|^WDC|^WDD|^W1K/i, 'Mercedes'],
  [/^WAU|^WA1/i, 'Audi'],
  [/^WP0/i, 'Porsche'],
  [/^WF0/i, 'Ford'],
  [/^VF1|^VF2/i, 'Renault'],
  [/^VF3/i, 'Peugeot'],
  [/^VF7|^VF8|^VF9/i, 'Citroën'],
  [/^ZFA|^ZFF/i, 'Fiat'],
  [/^YV1/i, 'Volvo'],
  [/^VNK/i, 'Toyota'],
  [/^TMA/i, 'Hyundai'],
  [/^XTA/i, 'Lada'],
];

function detectFromVin(text: string): string {
  // Cauta un sir de 17 caractere alfanumerice (format VIN standard)
  const vinMatch = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
  if (vinMatch) {
    const vin = vinMatch[1].toUpperCase();
    for (const [re, brand] of VIN_WMI) {
      if (re.test(vin)) return brand;
    }
  }
  // Incearca si primele 3 caractere din text daca par WMI
  const wmiMatch = text.match(/\b([A-HJ-NPR-Z0-9]{3})[A-HJ-NPR-Z0-9]{5,}/i);
  if (wmiMatch) {
    const wmi = wmiMatch[1].toUpperCase();
    for (const [re, brand] of VIN_WMI) {
      if (re.test(wmi)) return brand;
    }
  }
  return '';
}

export function detectCategory(groupTitle: string, name = '', manufacturerRef = ''): string {
  // Prioritate: titlu grupă → denumire produs → serie șasiu
  for (const text of [groupTitle, name, manufacturerRef]) {
    for (const [re, brand] of BRAND_KEYWORDS) {
      if (re.test(text)) return brand;
    }
  }
  // Detectie VIN din reper fabricatie si denumire
  for (const text of [manufacturerRef, name]) {
    const brand = detectFromVin(text);
    if (brand) return brand;
  }
  return '';
}

export async function searchCatalog(query: string): Promise<CatalogItem[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  const q = query.trim();
  const { data, error } = await supabase
    .from('catalog_items')
    .select('*')
    .or(`name.ilike.%${q}%,manufacturer_ref.ilike.%${q}%,part_code.ilike.%${q}%`)
    .order('use_count', { ascending: false })
    .limit(8);
  if (error) throw error;
  return data as CatalogItem[];
}

export async function fetchCatalog(search?: string): Promise<CatalogItem[]> {
  let q = supabase
    .from('catalog_items')
    .select('*')
    .order('use_count', { ascending: false })
    .order('last_used_at', { ascending: false });
  if (search?.trim()) {
    const s = search.trim();
    q = q.or(`name.ilike.%${s}%,manufacturer_ref.ilike.%${s}%,part_code.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data as CatalogItem[];
}

export async function deleteCatalogItem(id: string): Promise<void> {
  const { error } = await supabase.from('catalog_items').delete().eq('id', id);
  if (error) throw error;
}

export async function updateCatalogItemCategory(id: string, category: string): Promise<void> {
  const { error } = await supabase.from('catalog_items').update({ category }).eq('id', id);
  if (error) throw error;
}

export async function upsertCatalogItems(
  items: Array<{ name: string; manufacturer_ref: string; part_code: string; unit: string; purchase_price: number }>
): Promise<void> {
  if (!items.length) return;
  const { error } = await supabase.rpc('upsert_catalog_items', { p_items: items });
  if (error) throw error;
}

export async function uploadLogo(
  file: File,
  slot: 'andcor' | 'iveco' | 'iso'
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${slot}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true, cacheControl: '3600' });
  if (error) throw error;
  const { data } = supabase.storage.from('logos').getPublicUrl(path);
  return data.publicUrl;
}
