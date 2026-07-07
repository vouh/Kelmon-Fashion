import AppShell from "@/components/layout/AppShell";

export default function ProfilePage() {
  return (
    <AppShell activeNav="profile">
      <main className="flex-1 pt-20 md:pt-0 px-margin-mobile md:px-margin-desktop py-lg">
        <h1 className="font-display-md text-display-md text-on-surface mb-4">Profile</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Account settings — coming soon.</p>
      </main>
    </AppShell>
  );
}
