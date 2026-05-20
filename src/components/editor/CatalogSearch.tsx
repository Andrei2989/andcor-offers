import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchCatalog } from '@/lib/queries';
import type { CatalogItem } from '@/types/db';
import { formatNumberRO } from '@/lib/format';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: CatalogItem) => void;
  placeholder?: string;
  className?: string;
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

export function CatalogSearch({ value, onChange, onSelect, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const debouncedValue = useDebouncedValue(value, 350);

  const { data: results = [] } = useQuery({
    queryKey: ['catalog-search', debouncedValue],
    queryFn: () => searchCatalog(debouncedValue),
    enabled: debouncedValue.trim().length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showDropdown = open && results.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <textarea
        ref={(el) => {
          (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
          if (el) autoResize(el);
        }}
        className={className}
        value={value}
        placeholder={placeholder}
        rows={1}
        style={{ overflow: 'hidden', fieldSizing: 'content', minHeight: '1.75rem' } as React.CSSProperties}
        onChange={(e) => {
          autoResize(e.target);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => { if (value.trim().length >= 2) setOpen(true); }}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
      />
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 w-80 bg-white border border-ink-200 rounded shadow-xl mt-0.5 max-h-56 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-navy hover:text-white border-b border-ink-100 last:border-0 group"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
                setOpen(false);
              }}
            >
              <p className="text-sm font-medium truncate">{item.name || <span className="italic text-ink-400">fără denumire</span>}</p>
              <div className="flex gap-3 text-xs text-ink-500 group-hover:text-white/70 mt-0.5">
                {item.manufacturer_ref && <span>Ref: {item.manufacturer_ref}</span>}
                {item.part_code && <span>Cod: {item.part_code}</span>}
                {item.purchase_price > 0 && <span>Ach: {formatNumberRO(item.purchase_price)}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
