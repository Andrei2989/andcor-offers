// The viewmodel consumed by the PDF document. Keep decoupled from DB types
// so the editor can build a valid preview from partial form state.

export interface PdfOfferItem {
  sort_order: number;
  name: string;
  manufacturer_ref: string;
  part_code: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

export interface PdfOfferGroup {
  title: string;
  sort_order: number;
  items: PdfOfferItem[];
}

export interface PdfCompany {
  company_name: string;
  cif: string;
  reg_number: string;
  address: string;
  phone: string;
  email: string;
  bank_account: string;
  logo_url: string;        // can be data URL or public URL
  iveco_logo_url: string;
  iso_logo_url: string;
}

export interface PdfOffer {
  offer_number: string;
  issue_date: string;        // YYYY-MM-DD
  valid_until: string;       // YYYY-MM-DD
  validity_days: number;
  delivery_days: number;
  delivery_unit: string;
  warranty_months: number;
  transport: string;
  payment_method: string;
  company: PdfCompany;
  groups: PdfOfferGroup[];
}
