import type { OfferEditorState, OfferGroup, OfferItem } from '@/types/db';

export function lineTotal(item: OfferItem): number {
  return round2(item.quantity * item.unit_price);
}

export function groupTotal(group: OfferGroup): number {
  return round2(group.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0));
}

export function offerTotal(offer: Pick<OfferEditorState, 'groups'>): number {
  return round2(offer.groups.reduce((sum, g) => sum + groupTotal(g), 0));
}

// Round half away from zero to 2 decimals (ISO 4217 default for currency display).
function round2(n: number): number {
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(n) * 100 + Number.EPSILON)) / 100;
}
