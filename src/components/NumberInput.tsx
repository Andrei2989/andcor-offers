import { useState, useEffect, useRef } from 'react';
import { formatNumberRO, parseNumberLoose } from '@/lib/format';

interface Props {
  value: number | null;
  onChange: (n: number | null) => void;
  className?: string;
  placeholder?: string;
  min?: number;
  onBlur?: () => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  'aria-label'?: string;
}

export function NumberInput({ value, onChange, className, placeholder, min, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState<string>(value != null ? String(value) : '');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) setRaw(value != null ? String(value) : '');
  }, [value, focused]);

  const display = focused ? raw : formatNumberRO(value);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      value={display}
      onFocus={(e) => {
        setFocused(true);
        setRaw(value != null ? String(value) : '');
        e.target.select();
        rest.onFocus?.();
      }}
      onChange={(e) => {
        setRaw(e.target.value);
        const parsed = parseNumberLoose(e.target.value);
        if (parsed === null) {
          onChange(null);
        } else if (min != null && parsed < min) {
          onChange(min);
        } else {
          onChange(parsed);
        }
      }}
      onBlur={() => {
        setFocused(false);
        rest.onBlur?.();
      }}
      onKeyDown={rest.onKeyDown}
      aria-label={rest['aria-label']}
    />
  );
}
