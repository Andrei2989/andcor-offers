import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../theme';
import type { PdfOffer } from '../types';

const s = StyleSheet.create({
  wrap: {
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: C.navy,
  },
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
  row: { flexDirection: 'row' },
  cell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRightWidth: 0.5,
    borderRightColor: C.navy,
  },
  cellLast: { borderRightWidth: 0 },
  fieldLabel: { fontSize: 7, color: C.g700, marginBottom: 2 },
  value: { fontSize: 9, color: C.navy, fontWeight: 700 },
});

export function PdfClientBox({ offer }: { offer: PdfOffer }) {
  if (!offer.client_name && !offer.client_cif && !offer.client_address) return null;
  return (
    <View style={s.wrap}>
      <Text style={s.label}>CLIENT</Text>
      <View style={s.row}>
        <View style={s.cell}>
          <Text style={s.fieldLabel}>NUME</Text>
          <Text style={s.value}>{offer.client_name}</Text>
        </View>
        <View style={s.cell}>
          <Text style={s.fieldLabel}>CIF</Text>
          <Text style={s.value}>{offer.client_cif}</Text>
        </View>
        <View style={[s.cell, s.cellLast]}>
          <Text style={s.fieldLabel}>ADRESĂ</Text>
          <Text style={s.value}>{offer.client_address}</Text>
        </View>
      </View>
    </View>
  );
}
