import type { UIMessage } from "ai";

export const MAX_MESSAGES = 20;
export const MAX_CHARS = 1000;
/** Messages sent to the model. Older turns are dropped to stay within the provider's token budget. */
export const CONTEXT_MESSAGES = 8;

/**
 * Keeps only user/assistant text from the client's history and enforces size limits.
 * Returns null when the conversation is too long or the last message isn't a usable question.
 */
export function cleanMessages(messages: UIMessage[]): UIMessage[] | null {
  if (messages.length === 0 || messages.length > MAX_MESSAGES) return null;
  const cleaned: UIMessage[] = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") return null;
    const parts = m.parts.filter((p) => p.type === "text");
    const length = parts.reduce((n, p) => n + (p.type === "text" ? p.text.length : 0), 0);
    if (m.role === "user" && length > MAX_CHARS) return null;
    cleaned.push({ id: m.id, role: m.role, parts });
  }
  const last = cleaned[cleaned.length - 1];
  if (last.role !== "user" || last.parts.length === 0) return null;
  // Keep the most recent turns, starting on a user message.
  let recent = cleaned.slice(-CONTEXT_MESSAGES);
  while (recent[0].role !== "user") recent = recent.slice(1);
  return recent;
}
