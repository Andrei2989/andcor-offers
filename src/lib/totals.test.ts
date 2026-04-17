import { describe, it, expect } from 'vitest';
import { lineTotal, groupTotal, offerTotal } from './totals';
import type { OfferGroup, OfferItem } from '@/types/db';

const mkItem = (q: number, p: number, overrides: Partial<OfferItem> = {}): OfferItem => ({
  id: 'i',
  sort_order: 0,
  name: 'test',
  manufacturer_ref: '',
  part_code: '',
  unit: 'buc',
  quantity: q,
  unit_price: p,
  ...overrides,
});

describe('lineTotal', () => {
  it('multiplies qty by price', () => {
    expect(lineTotal(mkItem(20, 1150))).toBe(23000);
    expect(lineTotal(mkItem(1, 2950))).toBe(2950);
    expect(lineTotal(mkItem(50, 33))).toBe(1650);
  });
  it('rounds to 2 decimals for realistic currency inputs', () => {
    expect(lineTotal(mkItem(3, 19.99))).toBe(59.97);
    expect(lineTotal(mkItem(7, 0.1))).toBe(0.7);
  });
});

describe('groupTotal / offerTotal', () => {
  it('matches the reference offer ADV1524198', () => {
    const g1: OfferGroup = {
      id: 'g1', title: 'Grupa 1', sort_order: 0,
      items: [mkItem(1, 2950), mkItem(1, 3700), mkItem(20, 1150)],
    };
    const g2: OfferGroup = {
      id: 'g2', title: 'Grupa 2', sort_order: 1,
      items: [mkItem(60, 175), mkItem(15, 115), mkItem(32, 2500), mkItem(50, 33)],
    };
    expect(groupTotal(g1)).toBe(29650);
    expect(groupTotal(g2)).toBe(93875);
    expect(offerTotal({ groups: [g1, g2] })).toBe(123525);
  });
});
