import AppShell from "@/components/layout/AppShell";

export default function SalonPage() {
  return (
    <AppShell activeNav="salon">
      <main className="flex-1 pt-20 md:pt-0 px-margin-mobile md:px-margin-desktop py-lg">
        <h1 className="font-display-md text-display-md text-on-surface mb-4">Salon & Beauty</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Book your glam on campus — coming soon.</p>
      </main>
    </AppShell>
  );
}
