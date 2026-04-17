import { useEffect, useState } from 'react';
import type { SaveStatus } from '@/hooks/useOfferEditor';

export function SaveIndicator({
  status,
  lastSavedAt,
  error,
  onRetry,
}: {
  status: SaveStatus;
  lastSavedAt: number | null;
  error: string | null;
  onRetry: () => void;
}) {
  const [relative, setRelative] = useState('');

  useEffect(() => {
    if (!lastSavedAt) return;
    const update = () => {
      const s = Math.floor((Date.now() - lastSavedAt) / 1000);
      if (s < 2) setRelative('Salvat');
      else if (s < 60) setRelative(`Salvat acum ${s}s`);
      else setRelative(`Salvat acum ${Math.floor(s / 60)} min`);
    };
    update();
    const id = setInterval(update, 3000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  if (status === 'saving') return <span className="text-xs text-ink-500">Salvare…</span>;
  if (status === 'error')
    return (
      <span className="text-xs text-red-700">
        Eroare salvare — {error}{' '}
        <button onClick={onRetry} className="underline font-medium">
          Reîncearcă
        </button>
      </span>
    );
  if (status === 'saved' && relative) return <span className="text-xs text-green-700">{relative}</span>;
  return <span className="text-xs text-ink-500">Nesalvat</span>;
}
