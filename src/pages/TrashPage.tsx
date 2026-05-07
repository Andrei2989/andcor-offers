import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDeletedOffers, restoreOffer, permanentDeleteOffer } from '@/lib/queries';
import { formatDateRO, formatRON } from '@/lib/format';

export default function TrashPage() {
  const qc = useQueryClient();

  const { data: offers, isLoading, error } = useQuery({
    queryKey: ['deleted_offers'],
    queryFn: fetchDeletedOffers,
  });

  const restore = useMutation({
    mutationFn: restoreOffer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] });
      qc.invalidateQueries({ queryKey: ['deleted_offers'] });
    },
  });

  const permDel = useMutation({
    mutationFn: permanentDeleteOffer,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deleted_offers'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Coș de reciclare</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Ofertele șterse pot fi restaurate oricând sau șterse definitiv.
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-100 border-b border-ink-200">
            <tr className="text-left text-ink-700">
              <th className="px-4 py-2 font-medium">Număr</th>
              <th className="px-4 py-2 font-medium">Data ofertă</th>
              <th className="px-4 py-2 font-medium">Client</th>
              <th className="px-4 py-2 font-medium text-right">Valoare</th>
              <th className="px-4 py-2 font-medium">Șters la</th>
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
            {!isLoading && offers?.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                Coșul este gol.
              </td></tr>
            )}
            {offers?.map((o) => (
              <tr key={o.id} className="border-b border-ink-200 last:border-0 hover:bg-ink-100/50">
                <td className="px-4 py-2 font-mono text-navy font-medium">
                  {o.offer_number || <span className="text-ink-400 italic">fără număr</span>}
                </td>
                <td className="px-4 py-2">{formatDateRO(o.issue_date)}</td>
                <td className="px-4 py-2">{o.client_name || <span className="text-ink-400">—</span>}</td>
                <td className="px-4 py-2 text-right font-medium">{formatRON(Number(o.total))}</td>
                <td className="px-4 py-2 text-ink-500">
                  {o.deleted_at ? formatDateRO(o.deleted_at.slice(0, 10)) : '—'}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button
                    className="btn-ghost !py-1 !px-2 !text-xs text-green-700"
                    onClick={() => restore.mutate(o.id)}
                    disabled={restore.isPending}
                  >
                    Restaurează
                  </button>
                  <button
                    className="btn-ghost !py-1 !px-2 !text-xs text-red-700"
                    onClick={() => {
                      if (confirm(`Ștergi definitiv oferta ${o.offer_number || 'fără număr'}? Acțiunea este ireversibilă.`))
                        permDel.mutate(o.id);
                    }}
                    disabled={permDel.isPending}
                  >
                    Șterge definitiv
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
