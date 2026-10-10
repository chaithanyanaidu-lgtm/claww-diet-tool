"use client";

import { Tabs } from "radix-ui";
import { useState } from "react";
import type { AltMeal, Meal } from "@/lib/engine";
import { fmt, foodLabel } from "@/lib/labels";
import { dominantMacro, Plate, Swatch } from "./plate";

type Version = Pick<AltMeal, "foods" | "totals">;

function FoodList({ version }: { version: Version }) {
  return (
    <ul className="num w-full flex-1 text-sm">
      {version.foods.map((f) => (
        <li key={f.key} className="flex items-baseline gap-2 py-1">
          <Swatch color={dominantMacro(f)} className="self-center" />
          <span className="min-w-0">{foodLabel(f.name)}</span>
          <span aria-hidden="true" className="mb-1 min-w-4 flex-1 border-b border-dotted border-line" />
          <span className="text-right font-medium whitespace-nowrap">
            {fmt.int(f.qty)} {f.unit}
          </span>
          <span className="w-16 text-right text-xs whitespace-nowrap text-muted">{fmt.int(f.cal)} kcal</span>
        </li>
      ))}
    </ul>
  );
}

function VersionBody({ version, index, animate }: { version: Version; index: number; animate: boolean }) {
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
      <Plate foods={version.foods} index={index} animate={animate} />
      <FoodList version={version} />
    </div>
  );
}

export function MealSection({ meal, alternatives, index }: { meal: Meal; alternatives: AltMeal[]; index: number }) {
  const versions: { id: string; label: string; version: Version }[] = [
    { id: "original", label: "Original", version: meal },
    ...alternatives.map((a, i) => ({ id: `option-${i + 2}`, label: `Option ${i + 2}`, version: a })),
  ];
  const [active, setActive] = useState("original");
  // Plates draw once, on first load; switching versions shows them already drawn.
  const [switched, setSwitched] = useState(false);
  const current = versions.find((v) => v.id === active) ?? versions[0];
  const headingId = `meal-${meal.key}`;

  return (
    <section aria-labelledby={headingId} className="border-t border-line py-8">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 id={headingId} className="text-lg font-medium">
          {meal.name}
        </h2>
        <p className="num text-sm text-muted">{fmt.kcal(current.version.totals.cal)}</p>
      </div>

      {versions.length === 1 ? (
        <VersionBody version={meal} index={index} animate />
      ) : (
        <Tabs.Root
          value={active}
          onValueChange={(v) => {
            setActive(v);
            setSwitched(true);
          }}
        >
          {versions.map((v) => (
            <Tabs.Content key={v.id} value={v.id} className="outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
              <VersionBody version={v.version} index={index} animate={v.id === "original" && !switched} />
            </Tabs.Content>
          ))}
          <Tabs.List aria-label={`${meal.name} versions`} className="no-print mt-5 flex flex-wrap gap-2">
            {versions.map((v) => (
              <Tabs.Trigger
                key={v.id}
                value={v.id}
                className="rounded-full border border-line px-3.5 py-1.5 text-sm text-muted transition-colors hover:text-ink data-[state=active]:border-accent data-[state=active]:text-ink"
              >
                {v.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      )}
    </section>
  );
}
