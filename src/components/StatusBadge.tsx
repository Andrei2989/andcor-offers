import { clsx } from 'clsx';
import type { OfferStatus } from '@/types/db';

const LABELS: Record<OfferStatus, string> = {
  draft: 'Ciornă',
  sent: 'Trimisă',
  accepted: 'Acceptată',
  rejected: 'Refuzată',
  expired: 'Expirată',
};

const STYLES: Record<OfferStatus, string> = {
  draft: 'bg-ink-100 text-ink-700',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-900',
};

export function StatusBadge({ status }: { status: OfferStatus }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
