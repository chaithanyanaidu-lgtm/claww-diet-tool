import { Fragment, type ReactNode } from "react";

// Renders the assistant's light markdown (paragraphs, "-"/"1." lists, **bold**, `code` and
// fenced code blocks) as React elements. No HTML is ever injected, so model output can't add
// markup or scripts.

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((piece, i) => {
    if (piece.startsWith("**") && piece.endsWith("**") && piece.length > 4) {
      return (
        <strong key={i} className="font-medium">
          {piece.slice(2, -2)}
        </strong>
      );
    }
    if (piece.startsWith("`") && piece.endsWith("`") && piece.length > 2) {
      return (
        <code key={i} className="rounded bg-surface px-1 py-0.5 font-mono text-[0.9em]">
          {piece.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{piece}</Fragment>;
  });
}

/** Splits out ``` fenced blocks; an unclosed fence (still streaming) runs to the end. */
function splitFences(text: string): { code: boolean; body: string }[] {
  const out: { code: boolean; body: string }[] = [];
  const re = /```[\w+-]*\n?([\s\S]*?)(?:```|$)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ code: false, body: text.slice(last, m.index) });
    out.push({ code: true, body: m[1].replace(/\n$/, "") });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ code: false, body: text.slice(last) });
  return out;
}

export function RichText({ text }: { text: string }) {
  return (
    <>
      {splitFences(text.replace(/\\n/g, "\n")).map((seg, s) =>
        seg.code ? (
          <pre key={s} className="my-2 overflow-x-auto rounded-[12px] border border-line bg-surface p-3 font-mono text-xs leading-relaxed">
            <code>{seg.body}</code>
          </pre>
        ) : (
          <Prose key={s} text={seg.body} />
        ),
      )}
    </>
  );
}

function Prose({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/).filter(Boolean);
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
