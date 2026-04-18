import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCompany, fetchOffers, fetchOfferEditor, keys } from '@/lib/queries';
import { formatDateRO, formatRON } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { pdf } from '@react-pdf/renderer';
import { OfferDocument } from '@/pdf/OfferDocument';
import { toPdfOffer } from '@/lib/viewmodel';

export default function CustomerPage() {
  const { clientName } = useParams<{ clientName: string }>();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(clientName ?? '');

  const filters = { clientExact: decoded };
  const { data: offers, isLoading, error } = useQuery({
    queryKey: keys.offers(filters),
    queryFn: () => fetchOffers(filters),
    enabled: !!decoded,
  });
  const { data: company } = useQuery({ queryKey: keys.company, queryFn: fetchCompany });

  const first = offers?.[0];
  const totalValue = offers?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0;

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

  return (
    <div>
      <button className="btn-ghost !px-0 mb-4 text-sm" onClick={() => navigate('/')}>
        ← Înapoi la oferte
      </button>

      <div className="card p-5 mb-5">
        <h1 className="text-2xl font-bold text-navy mb-1">{decoded || '—'}</h1>
        {first?.client_cif && (
          <p className="text-sm text-ink-700">CIF: {first.client_cif}</p>
        )}
        {first?.client_address && (
          <p className="text-sm text-ink-700">{first.client_address}</p>
        )}
        <div className="flex gap-6 mt-3 pt-3 border-t border-ink-200">
          <div>
            <span className="text-xs text-ink-500 uppercase tracking-wide">Oferte</span>
            <p className="text-xl font-bold text-navy">{offers?.length ?? '—'}</p>
          </div>
          <div>
            <span className="text-xs text-ink-500 uppercase tracking-wide">Valoare totală</span>
            <p className="text-xl font-bold text-navy">{formatRON(totalValue)}</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-100 border-b border-ink-200">
            <tr className="text-left text-ink-700">
              <th className="px-4 py-2 font-medium">Număr</th>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium text-right">Valoare</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">Se încarcă…</td></tr>
            )}
            {error && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-red-700">
                Eroare: {(error as Error).message}
              </td></tr>
            )}
            {offers?.length === 0 && !isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                Nicio ofertă pentru acest client.
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
                <td className="px-4 py-2 text-right font-medium">{formatRON(Number(o.total))}</td>
                <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button className="btn-ghost !py-1 !px-2 !text-xs" onClick={() => navigate(`/offers/${o.id}/edit`)}>Editează</button>
                  <button className="btn-ghost !py-1 !px-2 !text-xs" onClick={() => downloadPdf(o.id, o.offer_number)}>PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
