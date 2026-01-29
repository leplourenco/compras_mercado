import React, { useMemo } from 'react';

export type AutocompleteOption<T extends string = string> = {
  id: string;
  label: string;
  meta?: string;
  value: T;
};

type Props<T extends string> = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  options: AutocompleteOption<T>[];
  onSelect: (opt: AutocompleteOption<T>) => void;
  maxOptions?: number;
};

export function Autocomplete<T extends string>(props: Props<T>) {
  const max = props.maxOptions ?? 8;

  const filtered = useMemo(() => {
    const t = props.value.trim().toLowerCase();
    if (!t) return [] as AutocompleteOption<T>[];
    const out: AutocompleteOption<T>[] = [];
    for (const o of props.options) {
      if (o.label.toLowerCase().includes(t)) {
        out.push(o);
        if (out.length >= max) break;
      }
    }
    return out;
  }, [props.options, props.value, max]);

  return (
    <div className="field grow">
      <label>{props.label}</label>
      <input
        className="textInput"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        autoComplete="off"
      />
      {filtered.length > 0 ? (
        <div className="suggestions">
          {filtered.map((o) => (
            <button
              type="button"
              key={o.id}
              className="suggestion"
              onClick={() => props.onSelect(o)}
            >
              <span className="suggestionName">{o.label}</span>
              {o.meta ? <span className="suggestionCat">{o.meta}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
