import { useEffect, useState } from 'react';
import { fetchOfferEditor, fetchCompany } from '@/lib/queries';
import { toPdfOffer } from '@/lib/viewmodel';
import { PdfPreviewPane } from './PdfPreviewPane';
import type { PdfOffer } from '@/pdf/types';

interface Props {
  offerId: string;
  offerNumber: string;
  onClose: () => void;
}

export function PdfPreviewModal({ offerId, offerNumber, onClose }: Props) {
  const [offer, setOffer] = useState<PdfOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [editor, company] = await Promise.all([fetchOfferEditor(offerId), fetchCompany()]);
        setOffer(toPdfOffer(editor, company ?? null));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [offerId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 p-4" onClick={onClose}>
      <div
        className="relative flex flex-col bg-white rounded-xl overflow-hidden shadow-2xl flex-1 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-navy text-white shrink-0">
          <span className="font-medium text-sm">Previzualizare — Oferta {offerNumber}</span>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-lg leading-none px-2"
            aria-label="Închide"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center h-full text-ink-500 text-sm">
              Se generează previzualizarea…
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-red-700 text-sm">
              Eroare: {error}
            </div>
          )}
          {offer && <PdfPreviewPane offer={offer} />}
        </div>
      </div>
    </div>
  );
}
