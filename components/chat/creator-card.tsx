import type { Creator } from "@/lib/creator";

const ROWS: { key: keyof Creator; label: string }[] = [
  { key: "rollNumber", label: "Roll number" },
  { key: "department", label: "Department" },
  { key: "college", label: "College" },
];

/** The developer's details, shown when someone asks the assistant who built the site. */
export function CreatorCard({ creator }: { creator: Creator }) {
  const initials = creator.name
    .replace(/\./g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <figure aria-label="About the creator" className="w-full max-w-sm overflow-hidden rounded-[16px] border border-line bg-surface">
      <div className="flex items-center gap-3 border-b border-line bg-accent/10 px-4 py-3">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-on-accent">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted">Created and developed by</p>
          <p className="truncate text-base font-medium">{creator.name}</p>
        </div>
      </div>
      <dl className="divide-y divide-line px-4 text-sm">
        {ROWS.map((r) => (
          <div key={r.key} className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="shrink-0 text-muted">{r.label}</dt>
            <dd className="num text-right font-medium">{creator[r.key]}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
