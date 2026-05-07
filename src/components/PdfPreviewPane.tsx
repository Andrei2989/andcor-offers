import { usePDF } from '@react-pdf/renderer';
import { useEffect, useMemo, useState } from 'react';
import { OfferDocument } from '@/pdf/OfferDocument';
import type { PdfOffer } from '@/pdf/types';

export function PdfPreviewPane({ offer }: { offer: PdfOffer }) {
  const [showPurchasePrice, setShowPurchasePrice] = useState(false);

  const offerWithFlag = useMemo(
    () => ({ ...offer, showPurchasePrice }),
    [offer, showPurchasePrice]
  );

  const doc = useMemo(() => <OfferDocument offer={offerWithFlag} />, [offerWithFlag]);
  const [instance, updateInstance] = usePDF({ document: doc });
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  useEffect(() => {
    updateInstance(doc);
    setLastUpdated(Date.now());
  }, [doc, updateInstance]);

  return (
    <div className="flex h-full flex-col bg-white border border-ink-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ink-200 bg-ink-100 text-xs text-ink-500">
        <span>
          {instance.loading ? 'Actualizare…' : instance.error ? 'Eroare generare' : 'Previzualizare actualizată'}
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-ink-600">
            <input
              type="checkbox"
              checked={showPurchasePrice}
              onChange={(e) => setShowPurchasePrice(e.target.checked)}
              className="rounded border-ink-300"
            />
            Preț achiziție în PDF
          </label>
          {instance.url ? (
            <a
              href={instance.url}
              download={`Oferta_${offer.offer_number}.pdf`}
              className="btn-primary !py-1 !px-3 !text-xs"
            >
              Descarcă PDF
            </a>
          ) : null}
        </div>
      </div>
      {instance.url ? (
        <iframe
          key={lastUpdated}
          src={instance.url}
          title="Previzualizare ofertă"
          className="flex-1 w-full border-0"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-ink-500 text-sm">
          Se generează…
        </div>
      )}
    </div>
  );
}
