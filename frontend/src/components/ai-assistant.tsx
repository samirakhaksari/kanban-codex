"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { PendingSaveError, PersistenceError } from "@/lib/persistence";
import type { AIChatMessage, AIChatResult } from "@/lib/persistence";

type Language = "fa" | "en";

type AssistantCopy = {
  title: string;
  description: string;
  close: string;
  history: string;
  empty: string;
  user: string;
  assistant: string;
  input: string;
  send: string;
  sending: string;
  networkError: string;
  genericError: string;
  conflictError: string;
  setupError: string;
  timeoutError: string;
  invalidError: string;
  sessionError: string;
  unsavedError: string;
};

const copyByLanguage: Record<Language, AssistantCopy> = {
  fa: {
    title: "دستیار کانبان",
    description: "برای وضعیت برد بپرسید یا تغییر تسک‌ها را درخواست کنید.",
    close: "بستن دستیار",
    history: "گفت‌وگو با دستیار",
    empty: "می‌توانید درباره‌ی برد بپرسید یا از دستیار بخواهید تسک‌ها را ایجاد، ویرایش یا جابه‌جا کند.",
    user: "شما",
    assistant: "دستیار",
    input: "پیام خود را بنویسید",
    send: "ارسال",
    sending: "در حال پاسخ...",
    networkError: "به سرور دسترسی پیدا نشد. اتصال را بررسی و دوباره تلاش کنید.",
    genericError: "ارسال پیام انجام نشد. دوباره تلاش کنید.",
    conflictError: "برد هنگام پاسخ تغییر کرد و چیزی اعمال نشد. پیام را دوباره بفرستید.",
    setupError: "دستیار هنوز آماده نیست. کمی بعد دوباره تلاش کنید.",
    timeoutError: "پاسخ طول کشید. دوباره تلاش کنید.",
    invalidError: "دستیار پاسخ معتبری نداد. دوباره تلاش کنید.",
    sessionError: "نشست ورود شما پایان یافته است. دوباره وارد شوید.",
    unsavedError: "ابتدا تغییرهای ذخیره‌نشده‌ی برد یا اعضای تیم را ذخیره کنید.",
  },
  en: {
    title: "AI assistant",
    description: "Ask about the board or request card changes.",
    close: "Close assistant",
    history: "Conversation with the assistant",
    empty: "Ask about your board, or ask the assistant to create, edit, or move cards.",
    user: "You",
    assistant: "Assistant",
    input: "Write a message",
    send: "Send",
    sending: "Thinking…",
    networkError: "The server could not be reached. Check your connection and try again.",
    genericError: "Your message could not be sent. Please try again.",
    conflictError: "The board changed while the assistant was responding; nothing was applied. Send your message again.",
    setupError: "The assistant is not ready yet. Please try again later.",
    timeoutError: "The response took too long. Please try again.",
    invalidError: "The assistant returned an invalid response. Please try again.",
    sessionError: "Your sign-in session ended. Please sign in again.",
    unsavedError: "Save pending board or team changes before using the assistant.",
  },
};

function historyForRequest(messages: AIChatMessage[]): AIChatMessage[] {
  let remainingCharacters = 8000;
  const selected: AIChatMessage[] = [];
  for (const message of messages.slice(-20).reverse()) {
    if (remainingCharacters <= 0) break;
    const content = message.content.slice(-remainingCharacters);
    selected.unshift({ role: message.role, content });
    remainingCharacters -= content.length;
  }
  return selected;
}

function errorMessage(error: unknown, copy: AssistantCopy): string {
  if (error instanceof PendingSaveError) return copy.unsavedError;
  if (error instanceof PersistenceError) {
    if (error.status === 401) return copy.sessionError;
    if (error.status === 409) return copy.conflictError;
    if (error.status === 422) return copy.genericError;
    if (error.status === 502) return copy.invalidError;
    if (error.status === 503) return copy.setupError;
    if (error.status === 504) return copy.timeoutError;
    if (error.status === undefined) return copy.networkError;
  }
  return copy.genericError;
}

type AIAssistantProps = {
  open: boolean;
  language: Language;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
  onSend: (question: string, history: AIChatMessage[]) => Promise<AIChatResult>;
};

export function AIAssistant({ open, language, onClose, onBusyChange, onSend }: AIAssistantProps) {
  const copy = copyByLanguage[language];
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const sendingRef = useRef(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const requestHistory = historyForRequest(messages);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages, isSending, error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || sendingRef.current) return;

    sendingRef.current = true;
    setError("");
    setDraft("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    setIsSending(true);
    onBusyChange(true);
    try {
      const result = await onSend(question, requestHistory);
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
    } catch (caught) {
      setError(errorMessage(caught, copy));
    } finally {
      sendingRef.current = false;
      setIsSending(false);
      onBusyChange(false);
    }
  }

  return (
    <section
      id="assistant-panel"
      className="assistant-panel"
      aria-labelledby="assistant-title"
      dir={language === "fa" ? "rtl" : "ltr"}
      lang={language}
      hidden={!open}
    >
      <header className="assistant-heading">
        <div className="assistant-heading-copy">
          <h2 id="assistant-title">{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        <button className="assistant-close" type="button" aria-label={copy.close} onClick={onClose}>
          <CloseIcon />
        </button>
      </header>
      <div className="assistant-messages" role="log" aria-label={copy.history} aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 ? (
          <p className="assistant-empty">{copy.empty}</p>
        ) : messages.map((message, index) => (
          <article className={`assistant-message ${message.role}`} key={`${index}-${message.role}`}>
            <span className="assistant-message-role">{message.role === "user" ? copy.user : copy.assistant}</span>
            <p dir="auto">{message.content}</p>
          </article>
        ))}
        {isSending && <p className="assistant-thinking" role="status">{copy.sending}</p>}
        {error && <p className="assistant-error" role="alert">{error}</p>}
        <div ref={endOfMessagesRef} />
      </div>
      <form className="assistant-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="sr-only" htmlFor="assistant-message-input">{copy.input}</label>
        <textarea
          id="assistant-message-input"
          maxLength={4000}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={copy.input}
          rows={2}
          dir="auto"
          value={draft}
          disabled={isSending}
        />
        <button className="assistant-send" type="submit" disabled={isSending || !draft.trim()}>
          {isSending ? <span className="assistant-spinner" aria-hidden="true" /> : <SendIcon />}
          <span>{isSending ? copy.sending : copy.send}</span>
        </button>
      </form>
    </section>
  );
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function SendIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>;
}
