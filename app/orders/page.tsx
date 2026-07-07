import AppShell from "@/components/layout/AppShell";

export default function OrdersPage() {
  return (
    <AppShell activeNav="orders">
      <main className="flex-1 pt-20 md:pt-0 px-margin-mobile md:px-margin-desktop py-lg">
        <h1 className="font-display-md text-display-md text-on-surface mb-4">My Orders</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Order history — coming soon.</p>
      </main>
    </AppShell>
  );
}
