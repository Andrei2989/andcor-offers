import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../theme';

const s = StyleSheet.create({
  wrap: { marginTop: 10, marginBottom: 10, alignItems: 'center' },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: C.navy,
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 9,
    color: C.g500,
    marginTop: 2,
    textAlign: 'center',
  },
});

export function PdfTitle() {
  return (
    <View style={s.wrap}>
      <Text style={s.title}>OFERTĂ DE PREȚ</Text>
      <Text style={s.subtitle}>Price Quotation</Text>
    </View>
  );
}
