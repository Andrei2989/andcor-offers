import { SEED_OFFER } from '@/pdf/seedOffer';
import { PdfPreviewPane } from '@/components/PdfPreviewPane';

export default function DevPdf() {
  return (
    <div className="h-screen p-3">
      <PdfPreviewPane offer={SEED_OFFER} />
    </div>
  );
}
