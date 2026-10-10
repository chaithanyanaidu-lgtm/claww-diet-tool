"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import type { PlanInput } from "@/lib/engine";
import { RichText } from "./rich-text";

const SUGGESTIONS = ["Why this many calories?", "What can I swap at lunch?", "How do I prep these meals?"];
const MAX_CHARS = 1000;
const MAX_MESSAGES = 20;

function errorText(error: Error): string {
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    // not JSON
  }
  return "The assistant couldn't answer just now. Check your connection and try again.";
}

/** Questions about this plan, answered from the engine's numbers (see app/api/chat). */
export function PlanChat({ input }: { input: PlanInput }) {
  // Defaults to POST /api/chat. The answers travel with every message; the server rebuilds the plan.
  const { messages, sendMessage, status, error, stop, clearError, setMessages } = useChat();
  const [text, setText] = useState("");
  const textareaId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const busy = status === "submitted" || status === "streaming";
  const full = messages.length >= MAX_MESSAGES - 1;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function ask(question: string) {
    const q = question.trim();
    if (!q || busy || full) return;
    clearError();
    void sendMessage({ text: q.slice(0, MAX_CHARS) }, { body: { input } });
    setText("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(text);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      ask(text);
    }
  }

  return (
    <section aria-labelledby="chat-title" className="no-print rounded-[20px] border border-line bg-surface p-4 sm:p-6">
      <h2 id="chat-title" className="text-base font-medium">
        Ask about this plan
      </h2>
      <p className="mt-1 text-sm text-muted">
        Answers use this plan&apos;s numbers. The assistant explains; it doesn&apos;t change quantities.
      </p>

      {messages.length === 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="min-h-10 rounded-full border border-line px-4 text-sm text-ink transition-colors hover:border-muted"
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div ref={listRef} className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto" aria-live="polite" aria-busy={busy}>
          {messages.map((m) => {
            const content = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            if (m.role === "user") {
              return (
                <div key={m.id} className="ml-auto w-fit max-w-[85%] rounded-[16px] bg-accent px-4 py-2.5 text-sm whitespace-pre-wrap text-on-accent">
                  <span className="sr-only">You: </span>
                  {content}
                </div>
              );
            }
            return (
              <div key={m.id} className="max-w-[92%] rounded-[16px] border border-line bg-bg px-4 py-2.5 text-sm">
                <span className="sr-only">Assistant: </span>
                {content ? <RichText text={content} /> : <span className="text-muted">Thinking…</span>}
              </div>
            );
          })}
          {status === "submitted" && (
            <div className="w-fit rounded-[16px] border border-line bg-bg px-4 py-2.5 text-sm text-muted">Thinking…</div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {errorText(error)}
        </p>
      )}

      {full ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>This chat is full.</span>
          <Button variant="secondary" onClick={() => setMessages([])}>
            Start a new chat
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex items-end gap-2">
          <label htmlFor={textareaId} className="sr-only">
            Your question
          </label>
          <textarea
            id={textareaId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MAX_CHARS}
            placeholder="Ask a question"
            className="max-h-40 min-h-11 flex-1 resize-none rounded-[14px] border border-line bg-bg px-4 py-2.5 text-base outline-none field-sizing-content focus-visible:border-accent"
          />
          {busy ? (
            <button type="button" onClick={stop} className={buttonClass("secondary")}>
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!text.trim()} className={buttonClass("primary")}>
              Send
            </button>
          )}
        </form>
      )}
    </section>
  );
}
