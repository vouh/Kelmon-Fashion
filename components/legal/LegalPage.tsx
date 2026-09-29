import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { LEGAL_UPDATED } from "@/lib/legal";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/** Layout shared by /terms and /privacy: title, last-updated date, numbered sections. */
export default function LegalPage({
  title,
  sections,
  other,
}: {
  title: string;
  sections: LegalSection[];
  /** The companion document, linked at the bottom. */
  other: { href: string; label: string };
}) {
  return (
    <AppShell>
      <main className="flex-grow bg-background">
        <header className="bg-primary-container px-margin-mobile md:px-margin-desktop pt-12 pb-10 md:pt-16 md:pb-14">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display-lg text-3xl md:text-5xl text-on-surface tracking-tight">{title}</h1>
            <p className="mt-3 text-sm text-on-surface-variant">Last updated {LEGAL_UPDATED}</p>
          </div>
        </header>

        <div className="px-margin-mobile md:px-margin-desktop py-10 md:py-14">
          <div className="max-w-3xl mx-auto">
            <div className="space-y-10">
              {sections.map((section, i) => (
                <section key={section.id} id={section.id} className="scroll-mt-28">
                  <h2 className="font-display-lg text-xl md:text-2xl text-on-surface tracking-tight">
                    {i + 1}. {section.title}
                  </h2>
                  <div className="legal-body mt-3 space-y-3 text-[15px] leading-relaxed text-on-surface-variant">
                    {section.body}
                  </div>
                </section>
              ))}
            </div>

            <p className="mt-14 border-t border-primary/15 pt-6 text-sm text-on-surface-variant">
              See also our{" "}
              <Link href={other.href} className="font-semibold text-primary hover:underline underline-offset-4">
                {other.label}
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
