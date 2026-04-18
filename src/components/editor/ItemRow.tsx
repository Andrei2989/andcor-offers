import { NumberInput } from '@/components/NumberInput';
import { formatNumberRO } from '@/lib/format';
import type { OfferItem } from '@/types/db';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  item: OfferItem;
  index: number;
  onPatch: (patch: Partial<OfferItem>) => void;
  onDelete: () => void;
  onEnter: () => void;
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

export function ItemRow({ item, index, onPatch, onDelete, onEnter }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const baseCell = 'px-1 py-1 border-b border-ink-200';
  const inputCls = 'w-full rounded border-0 bg-transparent px-1 py-1 text-sm focus:ring-1 focus:ring-navy focus:bg-white focus:outline-none';
  const total = item.quantity * item.unit_price;

  const handleTabToNext = (e: React.KeyboardEvent<HTMLInputElement>, isLast: boolean) => {
    if (isLast && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <tr ref={setNodeRef} style={style} className="group">
      <td className={`${baseCell} w-8 text-center text-ink-500 text-xs cursor-grab`} {...attributes} {...listeners}>
        {index + 1}
      </td>
      <td className={baseCell}>
        <textarea
          className={`${inputCls} resize-none leading-snug`}
          style={{ overflow: 'hidden', fieldSizing: 'content', minHeight: '1.75rem' } as React.CSSProperties}
          value={item.name}
          placeholder="Denumire produs"
          rows={1}
          ref={(el) => { if (el) autoResize(el); }}
          onChange={(e) => { autoResize(e.target); onPatch({ name: e.target.value }); }}
        />
      </td>
      <td className={baseCell}>
        <textarea
          className={`${inputCls} resize-none leading-snug`}
          style={{ overflow: 'hidden', fieldSizing: 'content', minHeight: '1.75rem' } as React.CSSProperties}
          value={item.manufacturer_ref}
          placeholder="Reper fabricație"
          rows={1}
          ref={(el) => { if (el) autoResize(el); }}
          onChange={(e) => { autoResize(e.target); onPatch({ manufacturer_ref: e.target.value }); }}
        />
      </td>
      <td className={baseCell}>
        <input
          className={inputCls}
          value={item.part_code}
          placeholder="Cod reper"
          onChange={(e) => onPatch({ part_code: e.target.value })}
        />
      </td>
      <td className={`${baseCell} w-14`}>
        <input
          className={`${inputCls} text-center`}
          value={item.unit}
          onChange={(e) => onPatch({ unit: e.target.value })}
        />
      </td>
      <td className={`${baseCell} w-20`}>
        <NumberInput
          className={`${inputCls} text-right`}
          value={item.quantity}
          onChange={(v) => onPatch({ quantity: v ?? 0 })}
          min={0}
        />
      </td>
      <td className={`${baseCell} w-28`}>
        <NumberInput
          className={`${inputCls} text-right`}
          value={item.unit_price}
          onChange={(v) => onPatch({ unit_price: v ?? 0 })}
          min={0}
          onKeyDown={(e) => handleTabToNext(e, true)}
        />
      </td>
      <td className={`${baseCell} w-28 text-right font-semibold text-navy`}>
        {formatNumberRO(total)}
      </td>
      <td className={`${baseCell} w-10 text-right`}>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 text-sm px-1"
          aria-label="Șterge rând"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
