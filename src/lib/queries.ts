import { supabase } from './supabase';
import type {
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
      supabase.from('offers').select('*').eq('id', id).single(),
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
    .insert({ offer_number: '' })
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
      })),
    })),
  };
  const { error } = await supabase.rpc('save_offer', {
    p_offer_id: state.id,
    p_payload: payload,
  });
  if (error) throw error;
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
  const { error } = await supabase.from('offers').delete().eq('id', id);
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
