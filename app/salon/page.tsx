"use client";

import { FormEvent, useState } from "react";
import AppShell from "@/components/layout/AppShell";

export default function SalonPage() {
  const [phone, setPhone] = useState("");
  const [joined, setJoined] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    try {
      localStorage.setItem("kelmon-salon-waitlist", phone.trim());
    } catch {
      /* ignore */
    }
    setJoined(true);
  };

  return (
    <AppShell activeNav="salon">
      <main className="flex-1 px-margin-mobile md:px-margin-desktop py-lg max-w-xl">
        <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-3">Coming soon</p>
        <h1 className="font-display-md text-display-md text-on-surface mb-4">Salon & Beauty</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">
          On-campus gel manicures and glam booking isn’t open yet. Drop your number and we’ll text when slots go live.
        </p>
        {joined ? (
          <p className="text-secondary font-body-md text-body-md" role="status">
            You’re on the salon waitlist. We’ll be in touch.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1 sr-only" htmlFor="salon-phone">
              Phone number
            </label>
            <input
              id="salon-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              className="flex-1 h-12 px-4 rounded-lg bg-surface-container border border-white/10 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/50"
            />
            <button type="submit" className="h-12 px-6 rounded-lg btn-primary text-white font-button-text text-button-text">
              Notify me
            </button>
          </form>
        )}
      </main>
    </AppShell>
  );
}
