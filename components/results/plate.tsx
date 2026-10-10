import { FOOD_DB, type FoodPortion } from "@/lib/engine";

export type MacroColor = "protein" | "carbs" | "fat" | "fiber";

/** The macro that supplies most of a food's calories; vegetables count as fiber. */
export function dominantMacro(food: FoodPortion): MacroColor {
  const fd = FOOD_DB[food.key];
  if (fd.type === "veg") return "fiber";
  const p = fd.p * 4;
  const c = fd.c * 4;
  const f = fd.f * 9;
  if (p >= c && p >= f) return "protein";
  if (f >= c) return "fat";
  return "carbs";
}

const R = 40; // ring radius
const C = 2 * Math.PI * R;
const GAP = 2.5; // arc length left blank between foods

/**
 * A plate: a thin rim with a ring inside whose arcs are each food's share of the meal's
 * calories, coloured by the food's dominant macro. Decorative: the food list carries the data.
 */
export function Plate({ foods, index = 0, animate = false, size = 132 }: { foods: FoodPortion[]; index?: number; animate?: boolean; size?: number }) {
  const total = foods.reduce((s, f) => s + f.cal, 0);
  let start = 0;
  const arcs = total > 0
    ? foods.map((f) => {
        const len = (f.cal / total) * C;
        const arc = { key: f.key, start, len: Math.max(0, len - GAP), color: dominantMacro(f) };
        start += len;
        return arc;
      })
    : [];

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden="true"
      className={`plate shrink-0 ${animate ? "plate-draw" : ""}`}
      style={{ ["--plate-index" as string]: index }}
    >
      <circle cx="60" cy="60" r="57" fill="var(--surface)" stroke="var(--line)" strokeWidth="1.25" />
      <circle cx="60" cy="60" r="49" fill="none" stroke="var(--line)" strokeWidth="0.75" />
      {arcs.map((a) => (
        <circle
          key={a.key}
          className="plate-arc"
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={`var(--${a.color})`}
          strokeWidth="11"
          strokeDasharray={`${a.len} ${C}`}
          transform={`rotate(${(a.start / C) * 360 - 90} 60 60)`}
          style={{ ["--arc-length" as string]: a.len }}
        />
      ))}
    </svg>
  );
}

export const MACRO_LEGEND: { color: MacroColor; label: string }[] = [
  { color: "protein", label: "Protein" },
  { color: "carbs", label: "Carbs" },
  { color: "fat", label: "Fat" },
  { color: "fiber", label: "Vegetables" },
];

export function Swatch({ color, className = "" }: { color: MacroColor; className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 rounded-full ${className}`} style={{ background: `var(--${color})` }} />;
}
