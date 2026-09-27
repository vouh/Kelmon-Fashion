import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";

/** Shared presentational pieces for the admin pages. */

export function formatKes(amount: number): string {
  return `KES ${Number(amount).toLocaleString("en-KE")}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "3h ago" style relative time, as the old dashboard's Time column showed. */
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  iconColor = "text-purple-300",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: string;
  iconColor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-white/5 bg-zinc-900 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
          {label}
        </span>
        <span className={`material-symbols-outlined text-base ${iconColor}`}>{icon}</span>
      </div>
      <span className="text-2xl font-black text-white">{value}</span>
      {hint && <span className="text-[9px] font-bold text-white/20">{hint}</span>}
    </div>
  );
}

export function Panel({
  title,
  hint,
  action,
  children,
  padded = false,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <div>
          <h3 className="text-xs font-black text-white">{title}</h3>
          {hint && (
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">{hint}</p>
          )}
        </div>
        {action}
      </div>
      <div className={padded ? "p-4" : undefined}>{children}</div>
    </section>
  );
}

const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  awaiting_mpesa: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  confirmed: "bg-purple-400/10 text-purple-300 border-purple-400/20",
  packed: "bg-indigo-400/10 text-indigo-300 border-indigo-400/20",
  delivered: "bg-green-400/10 text-green-300 border-green-400/20",
  cancelled: "bg-red-400/10 text-red-300 border-red-400/20",
};

const PAYMENT_STATUS_STYLE: Record<PaymentStatus, string> = {
  unpaid: "bg-white/5 text-white/50 border-white/10",
  initiated: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  paid: "bg-green-400/10 text-green-300 border-green-400/20",
  failed: "bg-red-400/10 text-red-300 border-red-400/20",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${ORDER_STATUS_STYLE[status]}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${PAYMENT_STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span className="material-symbols-outlined text-3xl text-white/15">{icon}</span>
      <p className="text-xs font-bold uppercase tracking-widest text-white/25">{message}</p>
    </div>
  );
}

export const TH = "px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30";
export const TD = "px-3 py-2.5 text-xs text-white/70";
