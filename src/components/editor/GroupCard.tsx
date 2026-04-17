import type { OfferGroup, OfferItem } from '@/types/db';
import { ItemRow } from './ItemRow';
import { formatRON } from '@/lib/format';
import { groupTotal } from '@/lib/totals';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface Props {
  group: OfferGroup;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAddItem: () => void;
  onPatchItem: (iid: string, patch: Partial<OfferItem>) => void;
  onDeleteItem: (iid: string) => void;
  onReorderItems: (ids: string[]) => void;
}

export function GroupCard({
  group,
  onRename,
  onDelete,
  onAddItem,
  onPatchItem,
  onDeleteItem,
  onReorderItems,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = group.items.map((i) => i.id);
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from === -1 || to === -1) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, active.id as string);
    onReorderItems(next);
  };

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <input
          className="flex-1 border-0 bg-transparent text-base font-semibold text-navy focus:ring-1 focus:ring-navy focus:bg-white rounded px-1"
          value={group.title}
          onChange={(e) => onRename(e.target.value)}
          placeholder="Titlu grupă"
        />
        <button onClick={onDelete} className="btn-ghost !py-1 !px-2 !text-xs text-red-700">
          Șterge grupa
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-ink-500 border-b border-ink-200">
              <th className="px-1 py-1 w-8">#</th>
              <th className="px-1 py-1">Denumire</th>
              <th className="px-1 py-1">Reper fabricație</th>
              <th className="px-1 py-1">Cod reper</th>
              <th className="px-1 py-1 w-14">U/M</th>
              <th className="px-1 py-1 w-20 text-right">Cant.</th>
              <th className="px-1 py-1 w-28 text-right">Preț unitar</th>
              <th className="px-1 py-1 w-28 text-right">Valoare</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={group.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {group.items.map((it, idx) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    index={idx}
                    onPatch={(patch) => onPatchItem(it.id, patch)}
                    onDelete={() => onDeleteItem(it.id)}
                    onEnter={onAddItem}
                  />
                ))}
                {group.items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-2 py-4 text-center text-ink-500 text-xs">
                      Niciun articol. Apasă "+ Articol" pentru a adăuga.
                    </td>
                  </tr>
                )}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-200">
        <button onClick={onAddItem} className="btn-secondary !py-1 !px-3 !text-xs">
          + Articol
        </button>
        <div className="text-sm">
          <span className="text-ink-500 mr-2">TOTAL grupa (fără TVA)</span>
          <span className="font-bold text-navy">{formatRON(groupTotal(group))}</span>
        </div>
      </div>
    </div>
  );
}
