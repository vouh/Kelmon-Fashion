import Image from "next/image";

const faqs = [
  {
    q: "How fast is campus delivery?",
    a: "Orders placed before 3 PM are delivered same-day to UoN hostels and gates. Later orders arrive the next morning.",
  },
  {
    q: "Are your products original?",
    a: "Yes — every bag, perfume, and kit is sourced from verified suppliers and checked before dispatch. No fakes, ever.",
  },
  {
    q: "How can I pay?",
    a: "Pay instantly with M-Pesa at checkout, or choose cash on delivery and pay when your order arrives.",
  },
  {
    q: "What is your return policy?",
    a: "We offer easy returns within 7 days of delivery. Items must be unused and in their original packaging.",
  },
];

interface FaqSectionProps {
  image: string;
}

export default function FaqSection({ image }: FaqSectionProps) {
  return (
    <section className="px-margin-mobile md:px-margin-desktop py-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
        <div>
          <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-2">
            Help desk
          </p>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">
            The Kelmon Help Desk
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-6 max-w-md">
            We&apos;re here to make your glam journey effortless. Quick answers, real
            support, and smooth shopping.
          </p>
          <div className="divide-y divide-primary/15 border-y border-primary/15">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-title-lg text-title-lg text-on-surface hover:text-primary transition-colors">
                  {faq.q}
                  <span
                    className="material-symbols-outlined text-primary transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    add
                  </span>
                </summary>
                <p className="mt-3 font-body-md text-body-md text-on-surface-variant max-w-lg">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="hero-arch relative aspect-[3/4] overflow-hidden bg-surface-container border border-primary/20">
            <Image
              src={image}
              alt="Kelmon support"
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 768px) 90vw, 384px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
