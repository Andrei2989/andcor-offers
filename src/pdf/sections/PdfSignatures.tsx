import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../theme';
import type { PdfCompany } from '../types';

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', marginTop: 16 },
  col: { flex: 1, alignItems: 'center' },
  rule: { width: 160, height: 0.5, backgroundColor: C.g500, marginBottom: 4 },
  label: { fontSize: 8, color: C.g700 },
  name: { fontSize: 9, color: C.navy, fontWeight: 700, marginTop: 2 },
});

export function PdfSignatures({ company, clientName }: { company: PdfCompany; clientName?: string }) {
  return (
    <View style={s.wrap} wrap={false}>
      <View style={s.col}>
        <View style={s.rule} />
        <Text style={s.label}>Semnătură și ștampilă furnizor</Text>
        <Text style={s.name}>{company.company_name}</Text>
      </View>
      <View style={s.col}>
        <View style={s.rule} />
        <Text style={s.label}>Semnătură și ștampilă client</Text>
        {!!clientName && <Text style={s.name}>{clientName}</Text>}
      </View>
    </View>
  );
}
