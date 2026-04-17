import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../theme';
import type { PdfOffer, PdfCompany } from '../types';

const s = StyleSheet.create({
  title: {
    fontSize: 10,
    fontWeight: 700,
    color: C.navy,
    marginTop: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.3,
    borderBottomColor: C.g200,
    paddingVertical: 3,
  },
  label: { flex: 1, fontSize: 8.5, color: C.g700 },
  value: { flex: 2, fontSize: 8.5, color: C.g900, fontWeight: 700 },
});

export function PdfTerms({ offer, company }: { offer: PdfOffer; company: PdfCompany }) {
  const rows: [string, string][] = [
    ['Valabilitate ofertă', `${offer.validity_days} zile de la data emiterii`],
    ['Termen de livrare', `${offer.delivery_days} ${offer.delivery_unit}`],
    ['Garanție', `${offer.warranty_months} luni`],
    ['Transport', offer.transport],
    ['Prețuri', 'Exprimate în RON, fără TVA'],
    ['Facturare', 'Înregistrat E-Factură'],
    ['Modalitate de plată', offer.payment_method],
    ['Cont Trezorerie', company.bank_account],
  ];
  return (
    <View>
      <Text style={s.title}>TERMENI ȘI CONDIȚII</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={s.row}>
          <Text style={s.label}>{label}</Text>
          <Text style={s.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}
