import { Fragment, type ReactNode } from "react";

// Renders the assistant's light markdown (paragraphs, "-"/"1." lists, **bold**) as React
// elements. No HTML is ever injected, so model output can't add markup or scripts.

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((piece, i) =>
    piece.startsWith("**") && piece.endsWith("**") && piece.length > 4 ? (
      <strong key={i} className="font-medium">
        {piece.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{piece}</Fragment>
    ),
  );
}

export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\\n/g, "\n").trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, b) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const isList = lines.length > 0 && lines.every((l) => /^([-*•]|\d+[.)])\s+/.test(l));
        if (isList) {
          const ordered = /^\d/.test(lines[0]);
          const List = ordered ? "ol" : "ul";
          return (
            <List key={b} className={`my-2 space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>
              {lines.map((l, i) => (
                <li key={i}>{inline(l.replace(/^([-*•]|\d+[.)])\s+/, ""))}</li>
              ))}
            </List>
          );
        }
        return (
          <p key={b} className="my-2 first:mt-0 last:mb-0">
            {lines.map((l, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {inline(l.replace(/^#+\s*/, ""))}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
