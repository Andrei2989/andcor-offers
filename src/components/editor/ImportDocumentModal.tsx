import { useRef, useState } from 'react';
import type { OfferGroup } from '@/types/db';
import { parseDocument, type ParsedItem } from '@/lib/parseDocument';

interface Props {
  groups: OfferGroup[];
  onImport: (gid: string, items: ParsedItem[]) => void;
  onClose: () => void;
}

type Step = 'upload' | 'loading' | 'preview' | 'error';

const ACCEPTED = '.docx,.xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp';

export function ImportDocumentModal({ groups, onImport, onClose }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState(groups[0]?.id ?? '');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

  async function process(file: File) {
    if (!apiKey) {
      setError('VITE_ANTHROPIC_API_KEY nu este configurat în .env.local');
      setStep('error');
      return;
    }
    setStep('loading');
    setError('');
    try {
      const result = await parseDocument(file, apiKey);
      if (!result.length) throw new Error('Nu au fost găsite articole în document.');
      setItems(result);
      setStep('preview');
    } catch (e) {
      setError((e as Error).message);
      setStep('error');
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) process(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) process(file);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function confirm() {
    if (!selectedGroup || !items.length) return;
    onImport(selectedGroup, items);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-200">
          <h2 className="font-semibold text-navy text-lg">Import din document</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-navy bg-navy/5' : 'border-ink-300 hover:border-navy'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-4xl mb-3">📄</div>
              <p className="font-medium text-ink-700">Trage documentul aici sau click pentru a selecta</p>
              <p className="text-sm text-ink-400 mt-1">Acceptat: .docx, .xlsx, .xls, .csv, .pdf, .jpg, .png, .webp</p>
              <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={onFileChange} />
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-10 h-10 border-4 border-navy border-t-transparent rounded-full animate-spin" />
              <p className="text-ink-600">Se procesează documentul cu AI…</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="text-red-600 text-center">
                <div className="text-3xl mb-2">⚠️</div>
                <p className="font-medium">Eroare la procesare</p>
                <p className="text-sm mt-1 text-ink-500">{error}</p>
              </div>
              <button className="btn-secondary" onClick={() => setStep('upload')}>Încearcă din nou</button>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <p className="text-sm text-ink-500 mb-3">
                {items.length} articole găsite. Poți elimina rânduri înainte de import.
              </p>
              <div className="overflow-x-auto rounded border border-ink-200 mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-ink-50 text-ink-500 uppercase text-xs tracking-wide">
                    <tr>
                      <th className="text-left px-3 py-2">Denumire</th>
                      <th className="px-3 py-2 text-center w-16">U/M</th>
                      <th className="px-3 py-2 text-right w-20">Cant.</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t border-ink-100 hover:bg-ink-50">
                        <td className="px-3 py-2 text-ink-800">{item.name}</td>
                        <td className="px-3 py-2 text-center text-ink-600">{item.unit}</td>
                        <td className="px-3 py-2 text-right text-ink-600">{item.quantity}</td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => removeItem(idx)}
                            className="text-ink-300 hover:text-red-500 text-xs leading-none"
                            title="Elimină"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-ink-700 whitespace-nowrap">Adaugă în grupa:</label>
                <select
                  className="input flex-1"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {step === 'preview' && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-ink-200">
            <button className="btn-secondary" onClick={onClose}>Anulează</button>
            <button
              className="btn-primary"
              disabled={!items.length || !selectedGroup}
              onClick={confirm}
            >
              Importă {items.length} articole
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
