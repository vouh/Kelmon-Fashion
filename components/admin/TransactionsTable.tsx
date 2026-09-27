import { EmptyState, Panel, TD, TH, formatDateTime, formatKes } from "@/components/admin/ui";
import type { OrderWithItems } from "@/lib/supabase/orders";

/**
 * Shared table for the successful / failed payment pages.
 * Ports admin/transactions.html and admin/transactions-failed.html, which were
 * near-identical files differing only in the status they filtered on.
 */
export default function TransactionsTable({
  orders,
  variant,
}: {
  orders: OrderWithItems[];
  variant: "success" | "failed";
}) {
  const success = variant === "success";

  if (orders.length === 0) {
    return (
      <Panel title={success ? "Successful payments" : "Failed payments"}>
        <EmptyState
          icon={success ? "check_circle" : "cancel"}
          message={success ? "No payments received yet" : "No failed payments"}
        />
      </Panel>
    );
  }

  const total = orders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <Panel
      title={success ? "Successful payments" : "Failed payments"}
      hint={`${orders.length} · ${formatKes(total)}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5">
            <tr>
              <th className={TH}>Order</th>
              <th className={TH}>Customer</th>
              <th className={TH}>Amount</th>
              <th className={TH}>M-Pesa receipt</th>
              <th className={TH}>Phone</th>
              <th className={TH}>{success ? "Paid" : "Reason"}</th>
              <th className={TH}>When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-white/5">
                <td className={`${TD} font-mono font-bold text-white`}>{order.id}</td>
                <td className={TD}>{order.customer_name}</td>
                <td className={`${TD} font-bold text-white`}>{formatKes(order.total)}</td>
                <td className={`${TD} font-mono`}>
                  {order.mpesa_receipt_number ?? <span className="text-white/20">—</span>}
                </td>
                <td className={TD}>{order.mpesa_phone ?? order.phone}</td>
                <td className={TD}>
                  {success ? (
                    <span className="inline-flex items-center gap-1 text-green-300">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Paid
                    </span>
                  ) : (
                    <span className="text-red-300/80">
                      {order.mpesa_result_desc ?? "Unknown error"}
                    </span>
                  )}
                </td>
                <td className={`${TD} text-white/40`}>{formatDateTime(order.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
