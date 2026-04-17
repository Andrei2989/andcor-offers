import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../theme';
import { formatDateRO } from '@/lib/format';
import type { PdfOffer } from '../types';

const s = StyleSheet.create({
  wrap: { marginBottom: 10, flexDirection: 'row', borderWidth: 0.5, borderColor: C.navy },
  cell: { flex: 1, borderRightWidth: 0.5, borderRightColor: C.navy },
  cellLast: { borderRightWidth: 0 },
  label: {
    fontSize: 7,
    color: C.navy,
    letterSpacing: 0.5,
    fontWeight: 700,
    backgroundColor: C.g100,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.navy,
  },
  value: {
    fontSize: 11,
    color: C.navy,
    fontWeight: 700,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
});

export function PdfMetaBox({ offer }: { offer: PdfOffer }) {
  const cells = [
    { label: 'NUMĂR OFERTĂ', value: offer.offer_number },
    { label: 'DATA EMITERII', value: formatDateRO(offer.issue_date) },
    { label: 'VALABILĂ PÂNĂ LA', value: formatDateRO(offer.valid_until) },
    { label: 'TERMEN LIVRARE', value: `${offer.delivery_days} zile` },
  ];
  return (
    <View style={s.wrap}>
      {cells.map((c, i) => (
        <View key={c.label} style={i === cells.length - 1 ? [s.cell, s.cellLast] : s.cell}>
          <Text style={s.label}>{c.label}</Text>
          <Text style={s.value}>{c.value}</Text>
        </View>
      ))}
    </View>
  );
}
