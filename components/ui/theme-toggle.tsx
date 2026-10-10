"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const KEY = "claww:theme";
const EVENT = "claww:theme";

function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    mq.removeEventListener("change", callback);
    window.removeEventListener(EVENT, callback);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // The choice still applies for this page view.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme ? `Switch to ${next} theme` : "Switch theme"}
      className="no-print inline-flex size-10 items-center justify-center rounded-full text-muted hover:text-ink"
    >
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
        <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2.75a7.25 7.25 0 0 1 0 14.5z" fill="currentColor" />
      </svg>
    </button>
  );
}
