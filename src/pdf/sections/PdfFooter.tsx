import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../theme';
import type { PdfCompany } from '../types';

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
  },
  rule: { height: 0.5, backgroundColor: C.g200, marginBottom: 6 },
  line: { fontSize: 7.5, color: C.g500, textAlign: 'center', lineHeight: 1.3 },
  pageInfo: {
    fontSize: 8,
    color: C.navy,
    fontWeight: 700,
    textAlign: 'center',
    marginTop: 2,
  },
});

export function PdfFooter({ company, offerNumber }: { company: PdfCompany; offerNumber: string }) {
  return (
    <View style={s.wrap} fixed>
      <View style={s.rule} />
      <Text style={s.line}>
        {company.company_name} • {company.address} • Tel: {company.phone} • {company.email}
      </Text>
      <Text style={s.line}>
        {company.reg_number} • CIF: {company.cif} • Cont: {company.bank_account}
      </Text>
      <Text
        style={s.pageInfo}
        render={({ pageNumber, totalPages }) =>
          `Ofertă ${offerNumber} | Pagina ${pageNumber}${totalPages > 1 ? ` din ${totalPages}` : ''}`
        }
      />
    </View>
  );
}
