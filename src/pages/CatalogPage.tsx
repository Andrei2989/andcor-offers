import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCatalogItem, fetchCatalog, updateCatalogItemCategory } from '@/lib/queries';
import { formatNumberRO } from '@/lib/format';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { CatalogItem } from '@/types/db';

const CATEGORY_COLORS: Record<string, string> = {
  Dacia: 'bg-blue-100 text-blue-800',
  Iveco: 'bg-orange-100 text-orange-800',
  TAB: 'bg-green-100 text-green-800',
  Renault: 'bg-yellow-100 text-yellow-800',
  Ford: 'bg-blue-100 text-blue-700',
  Volkswagen: 'bg-sky-100 text-sky-800',
  BMW: 'bg-gray-100 text-gray-800',
  Mercedes: 'bg-emerald-100 text-emerald-800',
  Opel: 'bg-red-100 text-red-700',
  Toyota: 'bg-red-100 text-red-800',
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'bg-ink-100 text-ink-700';
}

function CategoryEditor({ item, onSave }: { item: CatalogItem; onSave: (id: string, cat: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.category);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.category ? categoryColor(item.category) : 'bg-ink-100 text-ink-400 border border-dashed border-ink-300'}`}
        title="Click pentru a edita categoria"
      >
        {item.category || '+ categorie'}
      </button>
    );
  }

  return (
    <input
      autoFocus
      className="text-xs border border-navy rounded px-2 py-0.5 w-28 focus:outline-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { onSave(item.id, value); setEditing(false); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { onSave(item.id, value); setEditing(false); }
        if (e.key === 'Escape') { setValue(item.category); setEditing(false); }
      }}
    />
  );
}

export default function CatalogPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['catalog', debouncedSearch],
    queryFn: () => fetchCatalog(debouncedSearch || undefined),
  });

  const categories = [...new Set(allItems.map((i) => i.category).filter(Boolean))].sort();

  const items = activeCategory
    ? allItems.filter((i) => i.category === activeCategory)
    : allItems;

  const del = useMutation({
    mutationFn: deleteCatalogItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });

  const updateCat = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      updateCatalogItemCategory(id, category),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });

  // Grupare pe categorii pentru afisare
  const grouped: Record<string, CatalogItem[]> = {};
  for (const item of items) {
    const key = item.category || '— Fără categorie';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    if (a === '— Fără categorie') return 1;
    if (b === '— Fără categorie') return -1;
    return a.localeCompare(b);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Catalog piese</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Populat automat din oferte · {allItems.length} piese
          </p>
        </div>
      </div>

      {/* Filtre */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          className="input flex-1 min-w-48"
          placeholder="Caută după denumire, reper fabricație sau cod…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveCategory('')}
            className={`text-xs px-3 py-1 rounded-full border ${!activeCategory ? 'bg-navy text-white border-navy' : 'bg-white text-ink-700 border-ink-200'}`}
          >
            Toate
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? '' : cat)}
              className={`text-xs px-3 py-1 rounded-full border ${activeCategory === cat ? 'bg-navy text-white border-navy' : `${categoryColor(cat)} border-transparent`}`}
            >
              {cat} ({allItems.filter((i) => i.category === cat).length})
            </button>
          ))}
          {allItems.some((i) => !i.category) && (
            <button
              onClick={() => setActiveCategory(activeCategory === '__none__' ? '' : '__none__')}
              className={`text-xs px-3 py-1 rounded-full border ${activeCategory === '__none__' ? 'bg-navy text-white border-navy' : 'bg-white text-ink-400 border-dashed border-ink-300'}`}
            >
              Fără categorie ({allItems.filter((i) => !i.category).length})
            </button>
          )}
        </div>
      </div>

      {isLoading && <div className="text-center text-ink-500 py-12">Se încarcă…</div>}

      {!isLoading && allItems.length === 0 && (
        <div className="card p-8 text-center text-ink-500">
          Catalogul este gol. Se va popula automat pe măsură ce creezi oferte.
        </div>
      )}

      {!isLoading && sortedGroups.map((groupName) => {
        const groupItems = activeCategory === '__none__'
          ? (grouped['— Fără categorie'] ?? [])
          : (grouped[groupName] ?? []);
        if (activeCategory === '__none__' && groupName !== '— Fără categorie') return null;

        return (
          <div key={groupName} className="mb-6">
            <h2 className={`text-sm font-semibold mb-2 px-1 flex items-center gap-2`}>
              {groupName !== '— Fără categorie' ? (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${categoryColor(groupName)}`}>
                  {groupName}
                </span>
              ) : (
                <span className="text-ink-400 italic">Fără categorie</span>
              )}
              <span className="text-ink-400 font-normal">{groupItems.length} piese</span>
            </h2>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-ink-100 border-b border-ink-200">
                  <tr className="text-left text-ink-700">
                    <th className="px-4 py-2 font-medium">Denumire</th>
                    <th className="px-4 py-2 font-medium">Reper fabricație</th>
                    <th className="px-4 py-2 font-medium">Cod reper</th>
                    <th className="px-4 py-2 font-medium">U/M</th>
                    <th className="px-4 py-2 font-medium text-right">Preț achiziție</th>
                    <th className="px-4 py-2 font-medium text-center">Categorie</th>
                    <th className="px-4 py-2 font-medium text-center">Utilizări</th>
                    <th className="px-4 py-2 font-medium text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {groupItems.map((item) => (
                    <tr key={item.id} className="border-b border-ink-200 last:border-0 hover:bg-ink-100/50">
                      <td className="px-4 py-2 font-medium text-navy">
                        {item.name || <span className="text-ink-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-ink-600">
                        {item.manufacturer_ref || <span className="text-ink-400">—</span>}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-ink-600">
                        {item.part_code || <span className="text-ink-400">—</span>}
                      </td>
                      <td className="px-4 py-2 text-center text-ink-600">{item.unit}</td>
                      <td className="px-4 py-2 text-right font-medium text-amber-700">
                        {item.purchase_price > 0 ? formatNumberRO(item.purchase_price) : <span className="text-ink-400">—</span>}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <CategoryEditor
                          item={item}
                          onSave={(id, cat) => updateCat.mutate({ id, category: cat })}
                        />
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
      })}
    </div>
  );
}
