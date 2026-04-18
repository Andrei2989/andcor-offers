import { useMemo, useState } from 'react';
import { ImportDocumentModal } from '@/components/editor/ImportDocumentModal';
import type { ParsedItem } from '@/lib/parseDocument';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fetchCompany, fetchOfferEditor, keys } from '@/lib/queries';
import { useOfferEditor } from '@/hooks/useOfferEditor';
import { SaveIndicator } from '@/components/editor/SaveIndicator';
import { GroupCard } from '@/components/editor/GroupCard';
import { PdfPreviewPane } from '@/components/PdfPreviewPane';
import { toPdfOffer } from '@/lib/viewmodel';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatRON, addDays } from '@/lib/format';
import { offerTotal } from '@/lib/totals';

export default function OfferEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: initial, isLoading, error } = useQuery({
    queryKey: keys.offer(id!),
    queryFn: () => fetchOfferEditor(id!),
    enabled: Boolean(id),
  });
  const { data: company } = useQuery({ queryKey: keys.company, queryFn: fetchCompany });
  const { state, dispatch, saveStatus, lastSavedAt, lastError, saveNow } = useOfferEditor(initial ?? null);

  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [showImport, setShowImport] = useState(false);

  function handleImport(assignments: { gid: string; items: ParsedItem[] }[]) {
    assignments.forEach(({ gid, items }) => {
      dispatch({ type: 'IMPORT_ITEMS', gid, items });
    });
  }

  // Build PDF viewmodel from current form state, debounced for performance.
  const debouncedState = useDebouncedValue(state, 300);
  const pdfOffer = useMemo(
    () => (debouncedState?.id ? toPdfOffer(debouncedState, company ?? null) : null),
    [debouncedState, company]
  );

  if (isLoading || !state?.id) return <div className="text-ink-500">Se încarcă…</div>;
  if (error) return <div className="text-red-700">Eroare: {(error as Error).message}</div>;

  return (
    <div className="grid lg:grid-cols-[3fr_2fr] gap-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-ink-500">Editare ofertă</div>
            <h1 className="text-2xl font-bold text-navy font-mono">{state.offer_number}</h1>
          </div>
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} error={lastError} onRetry={saveNow} />
            <button className="btn-secondary !text-xs !py-1.5" onClick={() => setShowImport(true)}>
              Import document
            </button>
            <button className="btn-secondary !text-xs !py-1.5" onClick={() => navigate('/')}>
              Înapoi la listă
            </button>
            <button
              className="btn-primary lg:hidden !text-xs !py-1.5"
              onClick={() => setShowPreviewMobile((x) => !x)}
            >
              {showPreviewMobile ? 'Editare' : 'Previzualizare'}
            </button>
          </div>
        </div>

        <div className={showPreviewMobile ? 'hidden lg:block' : ''}>
          <MetadataCard state={state} dispatch={dispatch} />
          <ClientCard state={state} dispatch={dispatch} />
          <GroupList state={state} dispatch={dispatch} />
          <TermsCard state={state} dispatch={dispatch} />
          <div className="card p-4 mt-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase text-ink-500 tracking-wide">Total ofertă (fără TVA)</div>
              <div className="text-2xl font-bold text-navy">{formatRON(offerTotal(state))}</div>
            </div>
            <StatusSelect state={state} dispatch={dispatch} />
          </div>
        </div>
      </div>

      <div className={`lg:sticky lg:top-4 lg:self-start lg:h-[calc(100vh-6rem)] ${showPreviewMobile ? 'h-[80vh]' : 'hidden lg:block h-[85vh]'}`}>
        {pdfOffer && <PdfPreviewPane offer={pdfOffer} />}
      </div>

      {showImport && (
        <ImportDocumentModal
          groups={state.groups}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

// ---------- sub-components ----------

function MetadataCard({ state, dispatch }: Pick<ReturnType<typeof useOfferEditor>, 'state' | 'dispatch'>) {
  return (
    <div className="card p-4 mb-4">
      <h2 className="font-semibold text-navy mb-3">Metadate</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Data emiterii">
          <input
            type="date"
            className="input"
            value={state.issue_date}
            onChange={(e) => dispatch({ type: 'SET_META', patch: { issue_date: e.target.value } })}
          />
        </Field>
        <Field label="Valabilitate (zile)">
          <input
            type="number"
            className="input"
            value={state.validity_days}
            onChange={(e) => dispatch({ type: 'SET_META', patch: { validity_days: Number(e.target.value) || 0 } })}
          />
        </Field>
        <Field label="Valabilă până la">
          <input className="input bg-ink-100" readOnly value={addDays(state.issue_date, state.validity_days)} />
        </Field>
        <Field label="Termen livrare (zile)">
          <input
            type="number"
            className="input"
            value={state.delivery_days}
            onChange={(e) => dispatch({ type: 'SET_META', patch: { delivery_days: Number(e.target.value) || 0 } })}
          />
        </Field>
        <Field label="Unitate livrare">
          <input
            className="input"
            value={state.delivery_unit}
            onChange={(e) => dispatch({ type: 'SET_META', patch: { delivery_unit: e.target.value } })}
          />
        </Field>
        <Field label="Garanție (luni)">
          <input
            type="number"
            className="input"
            value={state.warranty_months}
            onChange={(e) => dispatch({ type: 'SET_META', patch: { warranty_months: Number(e.target.value) || 0 } })}
          />
        </Field>
        <Field label="Transport">
          <input
            className="input"
            value={state.transport}
            onChange={(e) => dispatch({ type: 'SET_META', patch: { transport: e.target.value } })}
          />
        </Field>
        <Field label="Modalitate de plată">
          <input
            className="input"
            value={state.payment_method}
            onChange={(e) => dispatch({ type: 'SET_META', patch: { payment_method: e.target.value } })}
          />
        </Field>
      </div>
    </div>
  );
}

function ClientCard({ state, dispatch }: Pick<ReturnType<typeof useOfferEditor>, 'state' | 'dispatch'>) {
  return (
    <div className="card p-4 mb-4">
      <h2 className="font-semibold text-navy mb-3">Client (opțional)</h2>
      <div className="grid md:grid-cols-3 gap-3">
        <Field label="Nume">
          <input
            className="input"
            value={state.client_name}
            onChange={(e) => dispatch({ type: 'SET_META', patch: { client_name: e.target.value } })}
          />
        </Field>
        <Field label="CIF">
          <input
            className="input"
            value={state.client_cif}
            onChange={(e) => dispatch({ type: 'SET_META', patch: { client_cif: e.target.value } })}
          />
        </Field>
        <Field label="Adresă">
          <input
            className="input"
            value={state.client_address}
            onChange={(e) => dispatch({ type: 'SET_META', patch: { client_address: e.target.value } })}
          />
        </Field>
      </div>
    </div>
  );
}

function TermsCard({ state, dispatch }: Pick<ReturnType<typeof useOfferEditor>, 'state' | 'dispatch'>) {
  return (
    <div className="card p-4 mt-4">
      <h2 className="font-semibold text-navy mb-3">Observații</h2>
      <textarea
        className="input min-h-[80px]"
        placeholder="Observații interne (nu apar în PDF)"
        value={state.notes}
        onChange={(e) => dispatch({ type: 'SET_META', patch: { notes: e.target.value } })}
      />
    </div>
  );
}

function StatusSelect({ state, dispatch }: Pick<ReturnType<typeof useOfferEditor>, 'state' | 'dispatch'>) {
  return (
    <div>
      <label className="label">Status</label>
      <select
        className="input"
        value={state.status}
        onChange={(e) => dispatch({ type: 'SET_STATUS', status: e.target.value as any })}
      >
        <option value="draft">Ciornă</option>
        <option value="sent">Trimisă</option>
        <option value="accepted">Acceptată</option>
        <option value="rejected">Refuzată</option>
        <option value="expired">Expirată</option>
      </select>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

// ---------- group list with drag reorder ----------

function GroupList({ state, dispatch }: Pick<ReturnType<typeof useOfferEditor>, 'state' | 'dispatch'>) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = state.groups.map((g) => g.id);
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from === -1 || to === -1) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, active.id as string);
    dispatch({ type: 'REORDER_GROUPS', ids: next });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-navy">Grupe articole</h2>
        <button className="btn-secondary !text-xs !py-1" onClick={() => dispatch({ type: 'ADD_GROUP' })}>
          + Grupă
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={state.groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          {state.groups.map((g) => (
            <SortableGroup key={g.id} id={g.id}>
              <GroupCard
                group={g}
                onRename={(title) => dispatch({ type: 'RENAME_GROUP', gid: g.id, title })}
                onDelete={() => {
                  if (confirm(`Ștergi grupa "${g.title}" cu toate articolele?`))
                    dispatch({ type: 'DEL_GROUP', gid: g.id });
                }}
                onAddItem={() => dispatch({ type: 'ADD_ITEM', gid: g.id })}
                onPatchItem={(iid, patch) => dispatch({ type: 'PATCH_ITEM', gid: g.id, iid, patch })}
                onDeleteItem={(iid) => dispatch({ type: 'DEL_ITEM', gid: g.id, iid })}
                onReorderItems={(ids) => dispatch({ type: 'REORDER_ITEMS', gid: g.id, ids })}
              />
            </SortableGroup>
          ))}
        </SortableContext>
      </DndContext>
      {state.groups.length === 0 && (
        <div className="card p-6 text-center text-ink-500 text-sm">
          Nicio grupă încă. Apasă "+ Grupă" pentru a începe.
        </div>
      )}
    </div>
  );
}

function SortableGroup({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  // Make the outer wrapper draggable by its padding area but not fields inside.
  // We expose listeners via an invisible handle in the card; here we just use the wrapper.
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  // Intentionally do not spread listeners here — dnd activation via dragging the group title is risky.
  // Reordering at the group level is accessible via keyboard later if needed.
  void attributes; void listeners;
  return <div ref={setNodeRef} style={style}>{children}</div>;
}

// expose so other files can import hook's type
export {};
