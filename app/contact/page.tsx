import AppShell from "@/components/layout/AppShell";
import ContactForm from "@/components/contact/ContactForm";

const contactDetails = [
  {
    icon: "location_on",
    label: "Campus",
    value: "University of Nairobi · Main campus pickup points",
  },
  {
    icon: "call",
    label: "Phone / WhatsApp",
    value: "+254 700 000 000",
    href: "https://wa.me/254700000000",
  },
  {
    icon: "mail",
    label: "Email",
    value: "hello@kelmon.co.ke",
    href: "mailto:hello@kelmon.co.ke",
  },
  {
    icon: "schedule",
    label: "Hours",
    value: "Mon–Sat · 9:00 AM – 7:00 PM",
  },
];

export default function ContactPage() {
  return (
    <AppShell activeNav="contact">
      <main className="flex-grow bg-[#faf6fc] dark:bg-background">
        <section className="px-margin-mobile md:px-margin-desktop pt-10 md:pt-14 pb-16 md:pb-20">
          <p className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-2">
            Contact
          </p>
          <h1 className="font-display-lg text-display-md md:text-display-lg text-on-surface mb-3 max-w-2xl">
            Get in touch
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-12">
            Orders, salon bookings, or campus delivery questions — we&apos;re here to help.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div className="space-y-8">
              <div>
                <h2 className="font-display-lg text-xl md:text-2xl text-on-surface mb-6">
                  Let&apos;s connect
                </h2>
                <ul className="space-y-5">
                  {contactDetails.map((item) => (
                    <li key={item.label} className="flex gap-4">
                      <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                          {item.icon}
                        </span>
                      </span>
                      <div>
                        <p className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                          {item.label}
                        </p>
                        {item.href ? (
                          <a
                            href={item.href}
                            className="font-body-md text-body-md text-on-surface hover:text-primary transition-colors"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="font-body-md text-body-md text-on-surface">{item.value}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-primary text-white p-6 md:p-8">
                <h3 className="font-display-lg text-lg mb-2">Prefer WhatsApp?</h3>
                <p className="text-white/85 text-sm leading-relaxed mb-5">
                  Fastest way to check stock, delivery slots, or salon availability.
                </p>
                <a
                  href="https://wa.me/254700000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 px-7 rounded-full bg-white text-primary text-[11px] font-semibold uppercase tracking-[0.14em] items-center gap-2 hover:bg-white/90 transition-colors"
                >
                  Chat on WhatsApp
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    chat
                  </span>
                </a>
              </div>
            </div>

            <div>
              <h2 className="font-display-lg text-xl md:text-2xl text-on-surface mb-6 lg:sr-only">
                Send a message
              </h2>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
