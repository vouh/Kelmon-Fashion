"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { formatKes } from "@/lib/products";

interface StoredOrder {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  dropPoint: string;
  payment: string;
  total: number;
  status: string;
  lines: { name: string; quantity: number; price: number }[];
}

export default function OrdersClient() {
  const searchParams = useSearchParams();
  const placedId = searchParams.get("placed");
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kelmon-orders");
      if (raw) setOrders(JSON.parse(raw) as StoredOrder[]);
    } catch {
      setOrders([]);
    }
  }, [placedId]);

  const latest = placedId ? orders.find((o) => o.id === placedId) : null;

  const onNotify = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setJoined(true);
  };

  return (
    <AppShell activeNav="orders">
      <main className="flex-1 px-margin-mobile md:px-margin-desktop py-lg max-w-3xl mx-auto w-full">
        <h1 className="font-display-md text-display-md text-on-surface mb-2">My Orders</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-8">
          Orders placed on this device are saved here until accounts go live.
        </p>

        {placedId && latest && (
          <div
            role="status"
            className="mb-8 rounded-xl border border-secondary/40 bg-secondary/10 p-6 space-y-2"
          >
            <p className="font-title-lg text-title-lg text-on-surface">Order placed</p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Reference <span className="text-secondary font-semibold">{latest.id}</span> ·{" "}
              {formatKes(latest.total)}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {latest.payment === "mpesa"
                ? "We’ll confirm M-Pesa and deliver to your campus drop point."
                : "Pay on delivery at your selected drop point."}
            </p>
            <Link
              href="/shop"
              className="inline-flex mt-2 text-secondary font-label-caps text-label-caps uppercase tracking-wider hover:text-primary"
            >
              Keep shopping →
            </Link>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="space-y-4 py-8">
            <p className="font-body-lg text-body-lg text-on-surface-variant">No orders yet.</p>
            <Link
              href="/shop"
              className="inline-flex h-12 px-8 rounded-lg btn-primary text-white font-button-text text-button-text items-center"
            >
              Shop now
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id} className="glass-panel rounded-xl p-5 space-y-2">
                <div className="flex justify-between gap-4 flex-wrap">
                  <span className="font-title-lg text-base text-on-surface">{order.id}</span>
                  <span className="font-body-md text-body-md text-secondary">{formatKes(order.total)}</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {new Date(order.createdAt).toLocaleString("en-KE")} · {order.dropPoint}
                </p>
                <p className="font-body-md text-sm text-on-surface-variant">
                  {order.lines.map((l) => `${l.name} ×${l.quantity}`).join(", ")}
                </p>
                <p className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">
                  {order.status.replace("_", " ")}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-12 rounded-xl border border-white/10 p-6">
          <h2 className="font-title-lg text-title-lg text-on-surface mb-2">Account sync — soon</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            Get an email when you can sign in and sync orders across devices.
          </p>
          {joined ? (
            <p className="text-secondary font-body-md text-body-md">You’re on the list.</p>
          ) : (
            <form onSubmit={onNotify} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@students.uonbi.ac.ke"
                className="flex-1 h-12 px-4 rounded-lg bg-surface-container border border-white/10 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/50"
              />
              <button type="submit" className="h-12 px-6 rounded-lg btn-secondary font-button-text text-button-text">
                Notify me
              </button>
            </form>
          )}
        </div>
      </main>
    </AppShell>
  );
}
