import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCompany, keys, upsertCompany, uploadLogo } from '@/lib/queries';
import type { CompanySettings } from '@/types/db';

export default function Settings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: keys.company, queryFn: fetchCompany });
  const [form, setForm] = useState<Partial<CompanySettings>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () => upsertCompany(form),
    onSuccess: (next) => {
      setForm(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      qc.invalidateQueries({ queryKey: keys.company });
    },
  });

  async function onUploadLogo(slot: 'andcor' | 'iveco' | 'iso', file: File) {
    const url = await uploadLogo(file, slot);
    const field = slot === 'andcor' ? 'logo_url' : slot === 'iveco' ? 'iveco_logo_url' : 'iso_logo_url';
    setForm((f) => ({ ...f, [field]: url }));
    await upsertCompany({ ...form, [field]: url });
    qc.invalidateQueries({ queryKey: keys.company });
  }

  if (isLoading) return <div className="text-ink-500">Se încarcă…</div>;

  const f = <K extends keyof CompanySettings>(k: K, label: string, placeholder?: string) => (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        value={(form[k] as string | undefined) ?? ''}
        placeholder={placeholder}
        onChange={(e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-navy">Setări companie</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-700">Salvat</span>}
          <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Salvare…' : 'Salvează'}
          </button>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-navy mb-4">Informații companie</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {f('company_name', 'Denumire')}
          {f('cif', 'CIF')}
          {f('reg_number', 'Număr înregistrare')}
          {f('address', 'Adresă')}
          {f('phone', 'Telefon')}
          {f('email', 'Email')}
          {f('bank_account', 'Cont Trezorerie')}
          {f('bank_name', 'Bancă')}
        </div>
      </div>

      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-navy mb-4">Logo-uri</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <LogoSlot label="ANDCOR" url={form.logo_url} onUpload={(f) => onUploadLogo('andcor', f)} />
          <LogoSlot label="IVECO" url={form.iveco_logo_url} onUpload={(f) => onUploadLogo('iveco', f)} />
          <LogoSlot label="ISO 9001" url={form.iso_logo_url} onUpload={(f) => onUploadLogo('iso', f)} />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-navy mb-4">Valori implicite</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="label">Valabilitate (zile)</label>
            <input
              className="input"
              type="number"
              value={form.default_validity_days ?? 60}
              onChange={(e) => setForm((prev) => ({ ...prev, default_validity_days: Number(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className="label">Termen livrare (zile)</label>
            <input
              className="input"
              type="number"
              value={form.default_delivery_days ?? 5}
              onChange={(e) => setForm((prev) => ({ ...prev, default_delivery_days: Number(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className="label">Garanție (luni)</label>
            <input
              className="input"
              type="number"
              value={form.default_warranty_months ?? 12}
              onChange={(e) => setForm((prev) => ({ ...prev, default_warranty_months: Number(e.target.value) || 0 }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoSlot({
  label,
  url,
  onUpload,
}: {
  label: string;
  url?: string | null;
  onUpload: (file: File) => void;
}) {
  return (
    <label className="block cursor-pointer">
      <div className="label">{label}</div>
      <div className="border border-dashed border-ink-200 rounded-md h-32 flex items-center justify-center bg-ink-100 overflow-hidden">
        {url ? <img src={url} alt={label} className="max-h-full max-w-full object-contain" /> : <span className="text-ink-500 text-xs">Apasă pentru a încărca</span>}
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </label>
  );
}
