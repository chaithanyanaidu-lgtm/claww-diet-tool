import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichText } from "@/components/chat/rich-text";

const html = (text: string) => renderToStaticMarkup(<RichText text={text} />);

describe("RichText", () => {
  it("renders fenced code as a code block", () => {
    const out = html("Here:\n\n```python\ndef f(s):\n    return s[::-1]\n```\n\nDone.");
    expect(out).toContain("<pre");
    expect(out).toContain("def f(s):\n    return s[::-1]");
    expect(out).not.toContain("```");
    expect(out).toContain("<p");
  });

  it("handles a fence that is still streaming", () => {
    expect(html("```js\nconst a = 1")).toContain("const a = 1");
  });

  it("renders bold, inline code and lists, and never raw HTML", () => {
    const out = html("**Hi** use `x`\n\n- one\n- two\n\n<script>alert(1)</script>");
    expect(out).toContain("<strong");
    expect(out).toContain("<code");
    expect(out).toContain("<li>one</li>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });
});
