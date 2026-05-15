import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCatalogItem, fetchCatalog } from '@/lib/queries';
import { formatNumberRO } from '@/lib/format';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function CatalogPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catalog', debouncedSearch],
    queryFn: () => fetchCatalog(debouncedSearch || undefined),
  });

  const del = useMutation({
    mutationFn: deleteCatalogItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Catalog piese</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Populat automat din oferte. {items.length > 0 && `${items.length} piese.`}
          </p>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <input
          className="input"
          placeholder="Caută după denumire, reper fabricație sau cod…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-100 border-b border-ink-200">
            <tr className="text-left text-ink-700">
              <th className="px-4 py-2 font-medium">Denumire</th>
              <th className="px-4 py-2 font-medium">Reper fabricație</th>
              <th className="px-4 py-2 font-medium">Cod reper</th>
              <th className="px-4 py-2 font-medium">U/M</th>
              <th className="px-4 py-2 font-medium text-right">Preț achiziție</th>
              <th className="px-4 py-2 font-medium text-center">Utilizări</th>
              <th className="px-4 py-2 font-medium text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-500">Se încarcă…</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-500">
                  {search
                    ? 'Nicio piesă găsită pentru această căutare.'
                    : 'Catalogul este gol. Se va popula automat pe măsură ce creezi oferte.'}
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-ink-200 last:border-0 hover:bg-ink-100/50">
                <td className="px-4 py-2 font-medium text-navy">
                  {item.name || <span className="text-ink-400 italic">—</span>}
                </td>
                <td className="px-4 py-2 font-mono text-xs">
                  {item.manufacturer_ref || <span className="text-ink-400">—</span>}
                </td>
                <td className="px-4 py-2 font-mono text-xs">
                  {item.part_code || <span className="text-ink-400">—</span>}
                </td>
                <td className="px-4 py-2 text-center text-ink-600">{item.unit}</td>
                <td className="px-4 py-2 text-right font-medium text-amber-700">
                  {item.purchase_price > 0 ? formatNumberRO(item.purchase_price) : <span className="text-ink-400">—</span>}
                </td>
                <td className="px-4 py-2 text-center">
                  <span className="bg-navy/10 text-navy text-xs font-semibold px-2 py-0.5 rounded-full">
                    {item.use_count}×
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    className="btn-ghost !py-1 !px-2 !text-xs text-red-700"
                    onClick={() => {
                      if (confirm(`Ștergi "${item.name || item.manufacturer_ref}" din catalog?`)) {
                        del.mutate(item.id);
                      }
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
