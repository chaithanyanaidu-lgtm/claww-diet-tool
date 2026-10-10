import type { PlanInput, PlanReport } from "@/lib/engine";
import { GOAL_LABELS, fmt, foodLabel } from "@/lib/labels";

// jsPDF's built-in fonts only cover Latin-1 well, so text here sticks to plain characters.

async function loadLogo(): Promise<string | null> {
  try {
    const blob = await fetch("/brand/claww-logo.jpg").then((r) => r.blob());
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadPlanPdf(input: PlanInput, report: PlanReport) {
  // Loaded on click only: about 400 kB that most visitors never need.
  const [{ jsPDF }, { autoTable }, logo] = await Promise.all([import("jspdf"), import("jspdf-autotable"), loadLogo()]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ink: [number, number, number] = [24, 32, 28];
  const muted: [number, number, number] = [102, 112, 106];
  const accent: [number, number, number] = [47, 107, 79];
  const left = 16;
  let y = 18;

  if (logo) doc.addImage(logo, "JPEG", left, y - 6, 10, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...ink);
  doc.text("CLAWW diet plan", logo ? left + 14 : left, y + 1);

  y += 14;
  const t = report.targets;
  const s = report.totals;
  doc.setFontSize(22);
  doc.text(`${fmt.int(s.cal)} kcal a day`, left, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text(
    `Protein ${fmt.int(s.p)} g  |  Carbs ${fmt.int(s.c)} g  |  Fat ${fmt.int(s.f)} g  |  Fiber ${fmt.int(s.fib)} g`,
    left,
    y,
  );
  y += 5;
  doc.text(
    `${GOAL_LABELS[t.goal]}. Target ${fmt.int(t.targetCalories)} kcal from maintenance ${fmt.int(t.maintenanceCal)} kcal. ` +
      `${input.age} yrs, ${fmt.one(input.heightCm)} cm, ${fmt.one(input.weightKg)} kg.`,
    left,
    y,
  );
  y += 6;

  for (const meal of report.meals) {
    autoTable(doc, {
      startY: y,
      margin: { left, right: left },
      head: [[meal.name, "Amount", "kcal", "Protein", "Carbs", "Fat"]],
      body: meal.foods.map((f) => [
        foodLabel(f.name),
        `${fmt.int(f.qty)} ${f.unit}`,
        fmt.int(f.cal),
        `${fmt.one(f.p)} g`,
        `${fmt.one(f.c)} g`,
        `${fmt.one(f.f)} g`,
      ]),
      foot: [["Total", "", fmt.int(meal.totals.cal), `${fmt.one(meal.totals.p)} g`, `${fmt.one(meal.totals.c)} g`, `${fmt.one(meal.totals.f)} g`]],
      theme: "plain",
      styles: { font: "helvetica", fontSize: 9.5, textColor: ink, cellPadding: { top: 1.6, bottom: 1.6, left: 1.5, right: 1.5 } },
      headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: [221, 226, 222] },
      footStyles: { fontStyle: "bold", lineWidth: { top: 0.3 }, lineColor: [221, 226, 222] },
      // Same column widths in every meal table, numbers right-aligned in head, body and foot.
      columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 24 }, 2: { cellWidth: 18 }, 3: { cellWidth: 22 }, 4: { cellWidth: 22 }, 5: { cellWidth: 22 } },
      didParseCell: (d) => {
        if (d.column.index > 0) d.cell.styles.halign = "right";
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  if (report.replacements.length) {
    autoTable(doc, {
      startY: y,
      margin: { left, right: left },
      head: [["Instead of", "Have", "Matched on", "kcal"]],
      body: report.replacements.map((r) => [
        `${foodLabel(r.fromName)} ${fmt.int(r.fromQty)} ${r.fromUnit}`,
        `${foodLabel(r.toName)} ${fmt.int(r.toQty)} ${r.toUnit}`,
        r.basis === "carbs" ? "Carbs" : r.basis === "fat" ? "Fat" : "Protein",
        fmt.int(r.cal),
      ]),
      theme: "plain",
      styles: { font: "helvetica", fontSize: 9, textColor: ink, cellPadding: 1.4 },
      headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: [221, 226, 222] },
      didParseCell: (d) => {
        if (d.column.index === 3) d.cell.styles.halign = "right";
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  doc.setFontSize(8.5);
  doc.setTextColor(...muted);
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 14) {
    doc.addPage();
    y = 18;
  }
  doc.text("Swap amounts are for the whole day. General guidance, not medical advice.", left, Math.max(y, pageH - 12));

  doc.save("claww-diet-plan.pdf");
}
