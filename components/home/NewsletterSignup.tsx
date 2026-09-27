"use client";

import { FormEvent, useState } from "react";

export default function NewsletterSignup() {
  const [phone, setPhone] = useState("");
  const [joined, setJoined] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    try {
      localStorage.setItem("kelmon-newsletter", phone.trim());
    } catch {
      /* ignore */
    }
    setJoined(true);
  };

  if (joined) {
    return (
      <p className="font-body-lg text-body-lg text-secondary" role="status">
        You&apos;re in. We&apos;ll text you the next drop.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <label htmlFor="newsletter-phone" className="sr-only">
        Phone number
      </label>
      <input
        id="newsletter-phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="07XX XXX XXX"
        className="flex-1 h-12 px-5 rounded-full bg-white text-black font-body-md text-body-md placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-secondary transition-shadow"
      />
      <button
        type="submit"
        className="h-12 px-8 rounded-full bg-secondary text-black font-button-text text-button-text shrink-0 hover:opacity-90 transition-opacity"
      >
        Notify me
      </button>
    </form>
  );
}
