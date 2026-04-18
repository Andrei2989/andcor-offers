import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { C } from '../theme';
import type { PdfCompany } from '../types';

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  logoCol: { flexDirection: 'column', gap: 6 },
  logoAndcor: { height: 72, width: 200, objectFit: 'contain', objectPositionX: 'left', objectPositionY: 'center' },
  subLogos: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIveco: { height: 18, width: 72, objectFit: 'contain', objectPositionX: 'left' },
  logoIso: { height: 34, width: 34, objectFit: 'contain' },
  info: { alignItems: 'flex-end' },
  name: { fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 2 },
  line: { fontSize: 8, color: C.g700, lineHeight: 1.35 },
  rule: { height: 1.5, backgroundColor: C.navy, marginTop: 8 },
});

export function PdfHeader({ company }: { company: PdfCompany }) {
  return (
    <View>
      <View style={s.row}>
        <View style={s.logoCol}>
          {company.logo_url ? <Image src={company.logo_url} style={s.logoAndcor} /> : null}
          <View style={s.subLogos}>
            {company.iveco_logo_url ? <Image src={company.iveco_logo_url} style={s.logoIveco} /> : null}
            {company.iso_logo_url ? <Image src={company.iso_logo_url} style={s.logoIso} /> : null}
          </View>
        </View>
        <View style={s.info}>
          <Text style={s.name}>{company.company_name}</Text>
          <Text style={s.line}>{company.address}</Text>
          <Text style={s.line}>Tel: {company.phone} | {company.email}</Text>
          <Text style={s.line}>{company.reg_number} | CIF: {company.cif}</Text>
        </View>
      </View>
      <View style={s.rule} />
    </View>
  );
}
