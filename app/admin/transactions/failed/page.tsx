import { redirect } from "next/navigation";

/**
 * Failed payments now live on the combined Payments page. Kept so old links
 * (and notifications, which point here) still land on the right view.
 */
export default function AdminFailedTransactionsPage() {
  redirect("/admin/transactions?filter=failed");
}
