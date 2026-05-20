import { useEffect, useState, startTransition } from 'react';

export function useDebouncedValue<T>(value: T, delay: number, asTransition = false): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(
      () => (asTransition ? startTransition(() => setV(value)) : setV(value)),
      delay,
    );
    return () => clearTimeout(id);
  }, [value, delay, asTransition]);
  return v;
}
