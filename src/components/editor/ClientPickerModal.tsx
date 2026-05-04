import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchClientList, type ClientEntry } from '@/lib/queries';

interface Props {
  onSelect: (client: ClientEntry) => void;
  onClose: () => void;
}

export function ClientPickerModal({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['client_list'],
    queryFn: fetchClientList,
  });

  const filtered = clients.filter((c) =>
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    c.client_cif.toLowerCase().includes(search.toLowerCase())
  );

  function pick(c: ClientEntry) {
    onSelect(c);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200">
          <h2 className="font-semibold text-navy text-lg">Alege client</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 text-xl leading-none">&times;</button>
        </div>

        <div className="px-5 py-3 border-b border-ink-100">
          <input
            autoFocus
            className="input w-full"
            placeholder="Caută după nume sau CIF…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="px-5 py-8 text-center text-ink-500">Se încarcă…</div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-ink-400 text-sm">
              {clients.length === 0
                ? 'Niciun client salvat încă. Clienții apar automat după prima ofertă salvată.'
                : 'Niciun client găsit.'}
            </div>
          )}
          {filtered.map((c) => (
            <button
              key={c.client_name}
              onClick={() => pick(c)}
              className="w-full text-left px-5 py-3 hover:bg-ink-50 border-b border-ink-100 last:border-0 transition-colors"
            >
              <div className="font-medium text-ink-800">{c.client_name}</div>
              <div className="text-xs text-ink-400 mt-0.5 flex gap-3">
                {c.client_cif && <span>CIF: {c.client_cif}</span>}
                {c.client_address && <span>{c.client_address}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
