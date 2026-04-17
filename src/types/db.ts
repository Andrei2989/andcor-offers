export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface CompanySettings {
  id: string;
  company_name: string;
  cif: string;
  reg_number: string;
  address: string;
  phone: string | null;
  email: string | null;
  bank_account: string | null;
  bank_name: string | null;
  logo_url: string | null;
  iveco_logo_url: string | null;
  iso_logo_url: string | null;
  default_validity_days: number;
  default_delivery_days: number;
  default_warranty_months: number;
  updated_at: string;
}

export interface OfferRow {
  id: string;
  offer_number: string;
  issue_date: string;
  validity_days: number;
  valid_until: string;
  delivery_days: number;
  delivery_unit: string;
  warranty_months: number;
  transport: string;
  payment_method: string;
  client_name: string | null;
  client_cif: string | null;
  client_address: string | null;
  notes: string | null;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
}

export interface OfferWithTotal extends OfferRow {
  total: number;
}

export interface OfferGroupRow {
  id: string;
  offer_id: string;
  title: string;
  sort_order: number;
}

export interface OfferItemRow {
  id: string;
  group_id: string;
  sort_order: number;
  name: string;
  manufacturer_ref: string;
  part_code: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

// ---------- Editor / view model ----------
export interface OfferItem {
  id: string;
  sort_order: number;
  name: string;
  manufacturer_ref: string;
  part_code: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

export interface OfferGroup {
  id: string;
  title: string;
  sort_order: number;
  items: OfferItem[];
}

export interface OfferEditorState {
  id: string;
  offer_number: string;
  issue_date: string;
  validity_days: number;
  delivery_days: number;
  delivery_unit: string;
  warranty_months: number;
  transport: string;
  payment_method: string;
  client_name: string;
  client_cif: string;
  client_address: string;
  notes: string;
  status: OfferStatus;
  groups: OfferGroup[];
  updated_at: string;
}
