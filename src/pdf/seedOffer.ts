import type { PdfOffer } from './types';
import { addDays } from '@/lib/format';

const ISSUE = '2026-04-17';

export const SEED_OFFER: PdfOffer = {
  offer_number: 'ADV1524198',
  issue_date: ISSUE,
  valid_until: addDays(ISSUE, 60),
  validity_days: 60,
  delivery_days: 5,
  delivery_unit: 'zile lucrătoare',
  warranty_months: 12,
  transport: 'Gratuit',
  payment_method: 'Ordin de plată',
  client_name: '',
  client_cif: '',
  client_address: '',
  company: {
    company_name: 'ANDCOR AUTO SRL',
    cif: 'RO42820863',
    reg_number: 'EUID ROONRC.J2020008572404',
    address: 'Str. Câmpineanca nr. 8, Sector 3, București',
    phone: '0726.425.618',
    email: 'corina@andcorauto.com',
    bank_account: 'RO02TREZ7035069XXX024484',
    logo_url: '/logos/andcor.png',
    iveco_logo_url: '/logos/iveco.png',
    iso_logo_url: '/logos/iso.png',
  },
  groups: [
    {
      title: 'Grupa 1 - Piese de direcție și frână (ansamblu)',
      sort_order: 0,
      items: [
        { sort_order: 0, name: 'Bară transversală direcție Iveco 6x6', manufacturer_ref: '5801692438', part_code: '5801692438', unit: 'buc', quantity: 1, unit_price: 2950 },
        { sort_order: 1, name: 'Bară longitudinală direcție Iveco 6x6', manufacturer_ref: '98165176', part_code: '98165176', unit: 'buc', quantity: 1, unit_price: 3700 },
        { sort_order: 2, name: 'Cilindru principal frână', manufacturer_ref: '03.3138-2001.3', part_code: '03.3138-2001.3', unit: 'buc', quantity: 20, unit_price: 1150 },
      ],
    },
    {
      title: 'Grupa 2 - Piese de frână și consumabile',
      sort_order: 1,
      items: [
        { sort_order: 0, name: 'Set plăcuțe frână', manufacturer_ref: '500086031', part_code: '130044 / E-truck', unit: 'buc', quantity: 60, unit_price: 175 },
        { sort_order: 1, name: 'Etanșare piston cuplare 6x6', manufacturer_ref: '46393066', part_code: '46393066', unit: 'buc', quantity: 15, unit_price: 115 },
        { sort_order: 2, name: 'Set reparație etrier', manufacturer_ref: '98120043', part_code: '98120043', unit: 'buc', quantity: 32, unit_price: 2500 },
        { sort_order: 3, name: 'Ulei instalație frânare', manufacturer_ref: 'NHTSA116-DOT4 SAE J1703', part_code: 'PFB401SE / TRW', unit: 'l', quantity: 50, unit_price: 33 },
      ],
    },
  ],
};
