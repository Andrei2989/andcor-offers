import { usePDF } from '@react-pdf/renderer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OfferDocument } from '@/pdf/OfferDocument';
import type { PdfOffer } from '@/pdf/types';

export function PdfPreviewPane({ offer }: { offer: PdfOffer }) {
  const [showPurchasePrice, setShowPurchasePrice] = useState(false);
  const [showPartCode, setShowPartCode] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  // Holds the last "committed" offer data — only updates on manual refresh.
  const [lockedOffer, setLockedOffer] = useState(offer);
  const [hasChanges, setHasChanges] = useState(false);
  const mountedRef = useRef(false);

  // When the incoming offer changes (user is typing), just flag it — don't re-render PDF.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setHasChanges(true);
  }, [offer]);

  // Checkboxes apply immediately on the locked offer (explicit user action, not typing).
  const committedOffer = useMemo(
    () => ({ ...lockedOffer, showPurchasePrice, showPartCode }),
    [lockedOffer, showPurchasePrice, showPartCode]
  );

  const doc = useMemo(() => <OfferDocument offer={committedOffer} />, [committedOffer]);
  const [instance, updateInstance] = usePDF({ document: doc });

  useEffect(() => {
    const prev = instance.url;
    updateInstance(doc);
    return () => { if (prev) URL.revokeObjectURL(prev); };
  }, [doc, updateInstance]);

  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFullscreen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  function handleRefresh() {
    setLockedOffer(offer);
    setHasChanges(false);
  }

  const controls = (
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
      <label className="flex items-center gap-1.5 cursor-pointer select-none text-ink-600">
        <input
          type="checkbox"
          checked={showPartCode}
          onChange={(e) => setShowPartCode(e.target.checked)}
          className="rounded border-ink-300"
        />
        Cod reper în PDF
      </label>
      <button
        onClick={handleRefresh}
        disabled={instance.loading}
        className={`relative btn-secondary !py-1 !px-3 !text-xs ${hasChanges ? 'ring-1 ring-amber-400' : ''}`}
      >
        {hasChanges && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
        )}
        Actualizează
      </button>
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
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/60 p-4" onClick={() => setFullscreen(false)}>
        <div
          className="flex flex-col bg-white rounded-xl overflow-hidden shadow-2xl flex-1 min-h-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-ink-200 bg-ink-100 text-xs text-ink-500 shrink-0">
            <span>
              {instance.loading ? 'Actualizare…' : instance.error ? 'Eroare generare' : 'Previzualizare PDF'}
            </span>
            <div className="flex items-center gap-3">
              {controls}
              <button
                onClick={() => setFullscreen(false)}
                className="text-ink-500 hover:text-ink-900 text-base leading-none px-1"
                title="Închide (Esc)"
              >
                ✕
              </button>
            </div>
          </div>
          {instance.url ? (
            <iframe
              key={instance.url}
              src={instance.url}
              title="Previzualizare ofertă"
              className="flex-1 w-full border-0"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-ink-500 text-sm">Se generează…</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white border border-ink-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ink-200 bg-ink-100 text-xs text-ink-500">
        <div className="flex items-center gap-2">
          <span>
            {instance.loading ? 'Actualizare…' : instance.error ? 'Eroare generare' : 'Previzualizare PDF'}
          </span>
          {instance.url && (
            <button
              onClick={() => setFullscreen(true)}
              className="text-ink-500 hover:text-ink-900"
              title="Mărește previzualizarea"
            >
              ⛶
            </button>
          )}
        </div>
        {controls}
      </div>
      {instance.url ? (
        <iframe
          key={instance.url}
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
