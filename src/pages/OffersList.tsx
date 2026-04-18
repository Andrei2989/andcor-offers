import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDraftOffer,
  deleteOffer,
  duplicateOfferRpc,
  fetchCompany,
  fetchOffers,
  keys,
  type OfferListFilters,
} from '@/lib/queries';
import { formatDateRO, formatRON } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { OfferStatus } from '@/types/db';
import { pdf } from '@react-pdf/renderer';
import { OfferDocument } from '@/pdf/OfferDocument';
import { fetchOfferEditor } from '@/lib/queries';
import { toPdfOffer } from '@/lib/viewmodel';

const STATUS_OPTIONS: OfferStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
const STATUS_LABEL: Record<OfferStatus, string> = {
  draft: 'Ciornă',
  sent: 'Trimisă',
  accepted: 'Acceptată',
  rejected: 'Refuzată',
  expired: 'Expirată',
};

export default function OffersList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<Set<OfferStatus>>(new Set());
  const [clientSearch, setClientSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(clientSearch, 300);

  const filters: OfferListFilters = {
    status: statusFilter.size ? [...statusFilter] : undefined,
    clientSearch: debouncedSearch || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
  };

  const { data: offers, isLoading, error } = useQuery({
    queryKey: keys.offers(filters),
    queryFn: () => fetchOffers(filters),
  });
  const { data: company } = useQuery({ queryKey: keys.company, queryFn: fetchCompany });

  const newDraft = useMutation({
    mutationFn: createDraftOffer,
    onSuccess: (id) => navigate(`/offers/${id}/edit`),
  });

  const dup = useMutation({
    mutationFn: duplicateOfferRpc,
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['offers'] });
      navigate(`/offers/${id}/edit`);
    },
  });

  const del = useMutation({
    mutationFn: deleteOffer,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  });

  async function downloadPdf(offerId: string, offerNumber: string) {
    const editor = await fetchOfferEditor(offerId);
    const vm = toPdfOffer(editor, company ?? null);
    const blob = await pdf(<OfferDocument offer={vm} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Oferta_${offerNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function toggleStatus(s: OfferStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-navy">Oferte</h1>
        <button className="btn-primary" onClick={() => newDraft.mutate()} disabled={newDraft.isPending}>
          + Ofertă nouă
        </button>
      </div>

      <div className="card p-4 mb-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="label">Căutare client</label>
            <input
              className="input"
              placeholder="Nume client…"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="label">De la</label>
            <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Până la</label>
            <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Status</label>
            <div className="flex flex-wrap gap-1">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    statusFilter.has(s) ? 'bg-navy text-white border-navy' : 'bg-white text-ink-700 border-ink-200'
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-100 border-b border-ink-200">
            <tr className="text-left text-ink-700">
              <th className="px-4 py-2 font-medium">Număr</th>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Client</th>
              <th className="px-4 py-2 font-medium text-right">Valoare</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">Se încarcă…</td></tr>
            )}
            {error && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-red-700">
                Eroare: {(error as Error).message}
              </td></tr>
            )}
            {offers?.length === 0 && !isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                Nicio ofertă încă. Apasă "+ Ofertă nouă" pentru a începe.
              </td></tr>
            )}
            {offers?.map((o) => (
              <tr key={o.id} className="border-b border-ink-200 last:border-0 hover:bg-ink-100/50">
                <td className="px-4 py-2">
                  <button
                    className="font-mono text-navy font-medium hover:underline"
                    onClick={() => navigate(`/offers/${o.id}/edit`)}
                  >
                    {o.offer_number}
                  </button>
                </td>
                <td className="px-4 py-2">{formatDateRO(o.issue_date)}</td>
                <td className="px-4 py-2">
                  {o.client_name
                    ? <button className="hover:underline text-left" onClick={() => navigate(`/customers/${encodeURIComponent(o.client_name!)}`)}>
                        {o.client_name}
                      </button>
                    : <span className="text-ink-500">—</span>}
                </td>
                <td className="px-4 py-2 text-right font-medium">{formatRON(Number(o.total))}</td>
                <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button className="btn-ghost !py-1 !px-2 !text-xs" onClick={() => navigate(`/offers/${o.id}/edit`)}>Editează</button>
                  <button className="btn-ghost !py-1 !px-2 !text-xs" onClick={() => dup.mutate(o.id)}>Duplică</button>
                  <button className="btn-ghost !py-1 !px-2 !text-xs" onClick={() => downloadPdf(o.id, o.offer_number)}>PDF</button>
                  <button
                    className="btn-ghost !py-1 !px-2 !text-xs text-red-700"
                    onClick={() => {
                      if (confirm(`Ștergi definitiv oferta ${o.offer_number}?`)) del.mutate(o.id);
                    }}
                  >
                    Șterge
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
