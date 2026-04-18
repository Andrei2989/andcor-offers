import { addDays } from './format';
import type { CompanySettings, OfferEditorState } from '@/types/db';
import type { PdfOffer } from '@/pdf/types';

export function toPdfOffer(state: OfferEditorState, company: CompanySettings | null): PdfOffer {
  return {
    offer_number: state.offer_number,
    issue_date: state.issue_date,
    valid_until: addDays(state.issue_date, state.validity_days),
    validity_days: state.validity_days,
    delivery_days: state.delivery_days,
    delivery_unit: state.delivery_unit,
    warranty_months: state.warranty_months,
    transport: state.transport,
    payment_method: state.payment_method,
    client_name: state.client_name ?? '',
    client_cif: state.client_cif ?? '',
    client_address: state.client_address ?? '',
    company: {
      company_name: company?.company_name ?? 'ANDCOR AUTO SRL',
      cif: company?.cif ?? '',
      reg_number: company?.reg_number ?? '',
      address: company?.address ?? '',
      phone: company?.phone ?? '',
      email: company?.email ?? '',
      bank_account: company?.bank_account ?? '',
      logo_url: company?.logo_url ?? '/logos/andcor.png',
      iveco_logo_url: company?.iveco_logo_url ?? '/logos/iveco.png',
      iso_logo_url: company?.iso_logo_url ?? '/logos/iso.png',
    },
    groups: state.groups.map((g) => ({
      title: g.title,
      sort_order: g.sort_order,
      items: g.items.map((i) => ({
        sort_order: i.sort_order,
        name: i.name,
        manufacturer_ref: i.manufacturer_ref,
        part_code: i.part_code,
        unit: i.unit,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    })),
  };
}
