import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { ParsedItem } from '@/lib/parseDocument';
import { useQueryClient } from '@tanstack/react-query';
import type { OfferEditorState, OfferGroup, OfferItem, OfferStatus } from '@/types/db';
import { saveOfferRpc } from '@/lib/queries';

type Action =
  | { type: 'REPLACE'; state: OfferEditorState }
  | { type: 'SET_META'; patch: Partial<Omit<OfferEditorState, 'groups' | 'id' | 'updated_at'>> }
  | { type: 'SET_STATUS'; status: OfferStatus }
  | { type: 'ADD_GROUP'; id?: string; title?: string }
  | { type: 'DEL_GROUP'; gid: string }
  | { type: 'RENAME_GROUP'; gid: string; title: string }
  | { type: 'REORDER_GROUPS'; ids: string[] }
  | { type: 'ADD_ITEM'; gid: string }
  | { type: 'DEL_ITEM'; gid: string; iid: string }
  | { type: 'PATCH_ITEM'; gid: string; iid: string; patch: Partial<OfferItem> }
  | { type: 'REORDER_ITEMS'; gid: string; ids: string[] }
  | { type: 'IMPORT_ITEMS'; gid: string; items: ParsedItem[] };

function reducer(state: OfferEditorState, action: Action): OfferEditorState {
  switch (action.type) {
    case 'REPLACE':
      return action.state;
    case 'SET_META':
      return { ...state, ...action.patch };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'ADD_GROUP':
      return {
        ...state,
        groups: [
          ...state.groups,
          {
            id: action.id ?? tempId(),
            title: action.title ?? `Grupa ${state.groups.length + 1}`,
            sort_order: state.groups.length,
            items: [],
          },
        ],
      };
    case 'DEL_GROUP':
      return {
        ...state,
        groups: state.groups.filter((g) => g.id !== action.gid).map((g, i) => ({ ...g, sort_order: i })),
      };
    case 'RENAME_GROUP':
      return {
        ...state,
        groups: state.groups.map((g) => (g.id === action.gid ? { ...g, title: action.title } : g)),
      };
    case 'REORDER_GROUPS': {
      const byId = new Map(state.groups.map((g) => [g.id, g]));
      const next = action.ids.map((id, i) => {
        const g = byId.get(id)!;
        return { ...g, sort_order: i };
      });
      return { ...state, groups: next };
    }
    case 'ADD_ITEM':
      return withGroup(state, action.gid, (g) => ({
        ...g,
        items: [
          ...g.items,
          {
            id: tempId(),
            sort_order: g.items.length,
            name: '',
            manufacturer_ref: '',
            part_code: '',
            unit: 'buc',
            quantity: 1,
            unit_price: 0,
          },
        ],
      }));
    case 'DEL_ITEM':
      return withGroup(state, action.gid, (g) => ({
        ...g,
        items: g.items.filter((i) => i.id !== action.iid).map((i, idx) => ({ ...i, sort_order: idx })),
      }));
    case 'PATCH_ITEM':
      return withGroup(state, action.gid, (g) => ({
        ...g,
        items: g.items.map((i) => (i.id === action.iid ? { ...i, ...action.patch } : i)),
      }));
    case 'REORDER_ITEMS':
      return withGroup(state, action.gid, (g) => {
        const byId = new Map(g.items.map((i) => [i.id, i]));
        return { ...g, items: action.ids.map((id, i) => ({ ...byId.get(id)!, sort_order: i })) };
      });
    case 'IMPORT_ITEMS':
      return withGroup(state, action.gid, (g) => ({
        ...g,
        items: [
          ...g.items,
          ...action.items.map((item, i) => ({
            id: tempId(),
            sort_order: g.items.length + i,
            name: item.name,
            manufacturer_ref: item.manufacturer_ref,
            part_code: '',
            unit: item.unit,
            quantity: item.quantity,
            unit_price: 0,
          })),
        ],
      }));
  }
}

function withGroup(
  state: OfferEditorState,
  gid: string,
  fn: (g: OfferGroup) => OfferGroup
): OfferEditorState {
  return { ...state, groups: state.groups.map((g) => (g.id === gid ? fn(g) : g)) };
}

function tempId() {
  return `tmp-${Math.random().toString(36).slice(2, 10)}`;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useOfferEditor(initial: OfferEditorState | null) {
  const [state, dispatch] = useReducer(reducer, initial ?? ({} as OfferEditorState));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const inflight = useRef<Promise<void> | null>(null);
  const qc = useQueryClient();

  // Replace state when initial loads from server.
  useEffect(() => {
    if (initial) dispatch({ type: 'REPLACE', state: initial });
  }, [initial?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // beforeunload guard — warn if there are unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveStatus]);

  const doSave = useCallback(async () => {
    if (!state?.id) return;
    if (inflight.current) return;
    setSaveStatus('saving');
    setLastError(null);
    inflight.current = saveOfferRpc(state)
      .then(() => {
        dirtyRef.current = false;
        setSaveStatus('saved');
        setLastSavedAt(Date.now());
        qc.invalidateQueries({ queryKey: ['offers'] });
      })
      .catch((err) => {
        setSaveStatus('error');
        setLastError(err.message ?? String(err));
      })
      .finally(() => {
        inflight.current = null;
      });
    await inflight.current;
  }, [state, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wrap dispatch: mark dirty + reset save indicator so user sees "Nesalvat".
  const dispatchAndSave = useCallback(
    (action: Action) => {
      dispatch(action);
      if (action.type !== 'REPLACE') {
        dirtyRef.current = true;
        setSaveStatus('idle');
      }
    },
    []
  );

  return { state, dispatch: dispatchAndSave, saveStatus, lastSavedAt, lastError, saveNow: doSave };
}
