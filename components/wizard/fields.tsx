"use client";

import { useId, useState, type KeyboardEvent } from "react";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-danger">
      {message}
    </p>
  );
}

export function NumberField({
  name,
  label,
  unit,
  hint,
  value,
  error,
  onChange,
  integer,
}: {
  name: string;
  label: string;
  unit?: string;
  hint?: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  integer?: boolean;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      <div className="relative mt-1.5">
        <input
          id={id}
          name={name}
          inputMode={integer ? "numeric" : "decimal"}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`num h-12 w-full rounded-[14px] border bg-surface px-4 ${unit ? "pr-14" : ""} text-base outline-none focus-visible:border-accent ${
            error ? "border-danger" : "border-line"
          }`}
        />
        {unit && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted">
            {unit}
          </span>
        )}
      </div>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

export function ChoiceGroup<T extends string>({
  name,
  legend,
  hint,
  options,
  value,
  error,
  onChange,
  columns,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: { value: T; label: string; hint?: string }[];
  value?: T;
  error?: string;
  onChange: (v: T) => void;
  columns?: boolean;
}) {
  const id = useId();
  return (
    <fieldset aria-describedby={error ? `${id}-err` : undefined}>
      <legend className="text-sm font-medium">{legend}</legend>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div className={`mt-2 ${columns ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}`}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer items-start gap-3 rounded-[14px] border px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                checked ? "border-accent bg-surface" : "border-line hover:border-muted"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  checked ? "border-accent" : "border-muted"
                }`}
              >
                {checked && <span className="size-2 rounded-full bg-accent" />}
              </span>
              <span>
                <span className="block font-medium">{o.label}</span>
                {o.hint && <span className="block text-sm text-muted">{o.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
      <FieldError id={`${id}-err`} message={error} />
    </fieldset>
  );
}

export function ChipToggleGroup({
  legend,
  hint,
  options,
  selected,
  onChange,
}: {
  legend: string;
  hint?: string;
  options: readonly string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <label
              key={o}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                on ? "border-accent bg-accent text-on-accent" : "border-line hover:border-muted"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
              />
              {o}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ChipInput({
  label,
  hint,
  values,
  error,
  onChange,
  max = 20,
}: {
  label: string;
  hint?: string;
  values: string[];
  error?: string;
  onChange: (v: string[]) => void;
  max?: number;
}) {
  const id = useId();
  const [text, setText] = useState("");

  function add() {
    const words = text
      .split(",")
      .map((w) => w.trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .map((w) => w.slice(0, 40));
    const next = [...values];
    for (const w of words) {
      if (next.length >= max) break;
      if (!next.some((v) => v.toLowerCase() === w.toLowerCase())) next.push(w);
    }
    onChange(next);
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Enter adds the typed food; with nothing typed it falls through and submits the step.
    if ((e.key === "Enter" || e.key === ",") && text.trim()) {
      e.preventDefault();
      e.stopPropagation();
      add();
    } else if (e.key === "Backspace" && !text && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Foods to avoid">
          {values.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-1 pr-1 pl-3.5 text-sm">
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Remove ${v}`}
                className="inline-flex size-7 items-center justify-center rounded-full text-muted hover:text-ink"
              >
                <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => text.trim() && add()}
          placeholder="Type a food and press Enter"
          autoComplete="off"
          enterKeyHint="enter"
          aria-describedby={[hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined}
          className="h-12 min-w-0 flex-1 rounded-[14px] border border-line bg-surface px-4 outline-none placeholder:text-muted focus-visible:border-accent"
        />
        <button
          type="button"
          onClick={add}
          disabled={!text.trim()}
          className="h-12 rounded-[14px] border border-line px-4 text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}
