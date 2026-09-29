import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import { LEGAL_CONTACT } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "What personal data Kelmon collects, why we use it, who we share it with, and your rights under Kenya's Data Protection Act.",
  path: "/privacy",
});

const link = "font-semibold text-primary hover:underline underline-offset-4";

const sections: LegalSection[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <p>
        {LEGAL_CONTACT.business} (&ldquo;Kelmon&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) runs this online store and
        is responsible for your personal data. We handle it in line with Kenya&apos;s Data Protection Act, 2019.
      </p>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <p>
          <strong className="text-on-surface">Information you give us</strong>
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-on-surface">Account details:</strong> your name, email address, password (stored
            securely by our sign-in provider — we never see it), and optionally your phone number, campus and profile
            photo.
          </li>
          <li>
            <strong className="text-on-surface">Order details:</strong> what you bought, your delivery drop point, any
            notes, and the phone number you pay with.
          </li>
          <li>
            <strong className="text-on-surface">Payment details:</strong> the M-Pesa phone number, amount, M-Pesa receipt
            number and payment result (for example &ldquo;wrong PIN&rdquo;). We never see or store your M-Pesa PIN.
          </li>
          <li>
            <strong className="text-on-surface">Messages and reviews:</strong> what you send through our contact form and
            the reviews you post.
          </li>
        </ul>
        <p>
          <strong className="text-on-surface">Information collected automatically</strong>
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Sign-in cookies that keep you logged in (see Cookies below).</li>
          <li>Your cart, theme choice and similar preferences, saved in your own browser.</li>
          <li>Basic technical logs (such as IP address and browser type) kept by our hosting provider for security.</li>
        </ul>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li>To create and run your account.</li>
        <li>To process your orders, take payment through M-Pesa and deliver to your drop point.</li>
        <li>
          To send you messages about your orders — payment confirmations, failed-payment notices and delivery updates.
        </li>
        <li>To award and track Kelmon Points.</li>
        <li>To reply to your messages and give customer support.</li>
        <li>To prevent fraud and keep the site secure.</li>
        <li>
          To send occasional news and offers by email. You can ask us to stop at any time and we will — order-related
          messages will still be sent.
        </li>
      </ul>
    ),
  },
  {
    id: "basis",
    title: "Our legal reasons",
    body: (
      <p>
        We use your data because we need it to fulfil our contract with you (your account and orders), because we have
        a legitimate interest in running a safe, working store, because you consented (for example to marketing emails),
        or because the law requires it (for example keeping transaction records for tax purposes).
      </p>
    ),
  },
  {
    id: "share",
    title: "Who we share it with",
    body: (
      <>
        <p>
          We don&apos;t sell your personal data. We share it only with trusted service providers that help us run
          Kelmon, and only what each one needs to do its job:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-on-surface">Payment provider</strong> — M-Pesa, to process your payments.
          </li>
          <li>
            <strong className="text-on-surface">Sign-in and security services</strong> — to create your account, sign
            you in and keep it secure.
          </li>
          <li>
            <strong className="text-on-surface">Secure cloud storage</strong> — where your account, orders and uploaded
            photos are stored.
          </li>
          <li>
            <strong className="text-on-surface">Email service</strong> — to send order updates and messages.
          </li>
          <li>
            <strong className="text-on-surface">Website hosting</strong> — to run the site and keep it available.
          </li>
          <li>Our delivery team — your name, phone number and drop point, only to deliver your order.</li>
        </ul>
        <p>
          We may also share data if the law requires it, or to protect our customers or the business from fraud.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "Data stored outside Kenya",
    body: (
      <p>
        Some of the services above store data on servers outside Kenya. Where that happens, we rely on providers that
        use strong security and contractual protections, as the Data Protection Act requires.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li>Account details: for as long as your account is open.</li>
        <li>
          Orders and payment records: for up to 7 years, because tax and accounting law requires us to keep transaction
          records.
        </li>
        <li>Contact messages: for up to 2 years, unless they relate to an open issue.</li>
        <li>
          When you close your account, we delete or anonymise your personal data, apart from records we must keep by law.
        </li>
      </ul>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>Under the Data Protection Act you have the right to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>be told how your data is used (this policy);</li>
          <li>get a copy of the personal data we hold about you;</li>
          <li>have wrong or incomplete data corrected — you can edit most of it yourself on your profile;</li>
          <li>have your data deleted, where we don&apos;t need to keep it by law;</li>
          <li>object to, or ask us to limit, how we use it — including opting out of marketing at any time.</li>
        </ul>
        <p>
          To use any of these rights, contact us (below). We&apos;ll reply within a reasonable time and may ask you to
          confirm your identity first. If you&apos;re unhappy with how we handle your data, you can complain to the
          Office of the Data Protection Commissioner (ODPC).
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and browser storage",
    body: (
      <>
        <p>We use a small number of essential cookies and browser storage:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-on-surface">Sign-in cookies</strong> — keep you logged in securely. Without them you
            can&apos;t sign in.
          </li>
          <li>
            <strong className="text-on-surface">Cart and preferences</strong> — your cart and light/dark theme are
            remembered in your own browser.
          </li>
        </ul>
        <p>We don&apos;t use advertising cookies or sell data to advertisers.</p>
      </>
    ),
  },
  {
    id: "security",
    title: "Keeping your data safe",
    body: (
      <p>
        Your data is sent over encrypted connections (HTTPS), passwords are handled by our sign-in provider and never
        stored by us, and access to customer data is restricted to authorised staff. No system is perfectly secure, so
        please use a strong password and keep it private. If a breach affects you, we&apos;ll notify you and the ODPC as
        the law requires.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        Kelmon is meant for adults and university students. We don&apos;t knowingly collect data from children under 18
        without a parent or guardian&apos;s consent. If you think a child has given us their data, contact us and
        we&apos;ll delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy. The date at the top shows the current version, and we&apos;ll tell you about
        significant changes on the site or by email.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        For privacy questions or requests, reach us through our{" "}
        <Link href={LEGAL_CONTACT.contactPage} className={link}>
          contact page
        </Link>{" "}
        or on WhatsApp at{" "}
        <a href={LEGAL_CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer" className={link}>
          {LEGAL_CONTACT.whatsapp}
        </a>
        . Please say it&apos;s a privacy request so it reaches the right person.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={sections}
      other={{ href: "/terms", label: "Terms of Service" }}
    />
  );
}
