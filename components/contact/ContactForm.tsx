"use client";

import { useState, type FormEvent } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 600);
  };

  if (sent) {
    return (
      <div className="bg-white dark:bg-surface border border-primary/15 p-8 md:p-10 text-center">
        <span
          className="material-symbols-outlined text-primary text-4xl mb-3 inline-block"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          mark_email_read
        </span>
        <h3 className="font-display-lg text-xl text-on-surface mb-2">Message sent</h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Thanks for reaching out. We&apos;ll get back to you within a day.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-6 inline-flex h-10 px-6 rounded-full border border-primary text-primary text-xs font-semibold uppercase tracking-wider hover:bg-primary/10 transition-colors"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white dark:bg-surface border border-primary/15 p-6 md:p-8 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
            First name
          </span>
          <input
            required
            name="firstName"
            type="text"
            autoComplete="given-name"
            className="mt-1.5 w-full h-11 px-3 bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-on-surface outline-none focus:border-primary transition-colors"
          />
        </label>
        <label className="block">
          <span className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
            Last name
          </span>
          <input
            required
            name="lastName"
            type="text"
            autoComplete="family-name"
            className="mt-1.5 w-full h-11 px-3 bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-on-surface outline-none focus:border-primary transition-colors"
          />
        </label>
      </div>

      <label className="block">
        <span className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
          Email
        </span>
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          className="mt-1.5 w-full h-11 px-3 bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-on-surface outline-none focus:border-primary transition-colors"
        />
      </label>

      <label className="block">
        <span className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
          Phone
        </span>
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+254 …"
          className="mt-1.5 w-full h-11 px-3 bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-on-surface outline-none focus:border-primary transition-colors"
        />
      </label>

      <label className="block">
        <span className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
          Message
        </span>
        <textarea
          required
          name="message"
          rows={5}
          className="mt-1.5 w-full px-3 py-3 bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-on-surface outline-none focus:border-primary transition-colors resize-y min-h-[120px]"
        />
      </label>

      <button
        type="submit"
        disabled={sending}
        className="w-full sm:w-auto inline-flex h-11 px-9 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-[0.16em] items-center justify-center gap-2 hover:bg-[#7a3a96] transition-colors disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send message"}
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          send
        </span>
      </button>
    </form>
  );
}
