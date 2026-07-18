import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  placeholder: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}

/** Type-to-filter combobox — free-texting "Lamborghini Gallardo LP570-4" is misery. */
export default function SearchableSelect({ placeholder, options, value, onChange, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => setHighlight(0), [query, open]);

  const select = (v: string) => {
    onChange(v);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="select" ref={rootRef}>
      <input
        className="select-input"
        placeholder={placeholder}
        disabled={disabled}
        value={open ? query : (value ?? '')}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter' && open && filtered[highlight]) {
            e.preventDefault();
            select(filtered[highlight]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && !disabled && (
        <ul className="select-list">
          {filtered.length === 0 && <li className="select-empty">no matches</li>}
          {filtered.slice(0, 60).map((o, i) => (
            <li
              key={o}
              className={`select-item ${i === highlight ? 'hl' : ''} ${o === value ? 'chosen' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                select(o);
              }}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
