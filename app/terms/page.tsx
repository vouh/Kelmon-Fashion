import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import { LEGAL_CONTACT } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from "@/lib/cart";
import { formatKes } from "@/lib/products";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms that apply when you create a Kelmon account, order, pay with M-Pesa, and return items.",
  path: "/terms",
});

const link = "font-semibold text-primary hover:underline underline-offset-4";

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreeing to these terms",
    body: (
      <>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) are an agreement between you and {LEGAL_CONTACT.business}{" "}
          (&ldquo;Kelmon&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). They apply whenever you visit our website,
          create an account, place an order or pay us.
        </p>
        <p>
          By creating an account, ticking &ldquo;I agree&rdquo;, or continuing with Google, you confirm that you have
          read and accept these Terms and our{" "}
          <Link href="/privacy" className={link}>
            Privacy Policy
          </Link>
          . If you don&apos;t agree, please don&apos;t use the site.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li>You must be at least 18, or have a parent or guardian&apos;s permission to use Kelmon and make purchases.</li>
        <li>Give us accurate details — especially your name and M-Pesa phone number — and keep them up to date.</li>
        <li>
          You&apos;re responsible for keeping your password safe and for everything done through your account. Tell us
          straight away if you think someone else has used it.
        </li>
        <li>One person, one account. Accounts can&apos;t be sold or transferred.</li>
        <li>You can ask us to close your account at any time (see Contact below).</li>
      </ul>
    ),
  },
  {
    id: "products",
    title: "Products, prices and stock",
    body: (
      <>
        <p>
          We work hard to describe and photograph products accurately, but colours can look different on different
          screens, and small variations are normal.
        </p>
        <p>
          All prices are in Kenya Shillings (KES). We may change prices at any time, but the price you pay is the one
          shown when you place your order. If we make an obvious pricing mistake, we&apos;ll contact you before
          processing the order and you can cancel for a full refund.
        </p>
        <p>
          Stock is limited. You can only order what&apos;s available, and an item isn&apos;t reserved for you until your
          payment is confirmed. If an item sells out before your payment goes through, we won&apos;t charge you for it.
        </p>
      </>
    ),
  },
  {
    id: "orders",
    title: "Placing an order",
    body: (
      <>
        <p>
          When you place an order you&apos;re making an offer to buy. The contract is formed when we confirm your
          order — for M-Pesa orders, when Safaricom confirms your payment; for pay-on-delivery orders, when we confirm
          the order to you.
        </p>
        <p>
          We may refuse or cancel an order — for example if the item is out of stock, the price was wrong, or we suspect
          fraud. If you&apos;ve already paid, we&apos;ll refund you in full.
        </p>
      </>
    ),
  },
  {
    id: "payment",
    title: "Payment",
    body: (
      <>
        <p>You can pay by M-Pesa (STK push to your phone) or, where offered, on delivery.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            For M-Pesa, you&apos;ll get a prompt on the phone number you enter. Your order is only paid once Safaricom
            confirms it. You&apos;ll never be asked for your M-Pesa PIN on our website, by phone or on WhatsApp — only
            on the official Safaricom prompt.
          </li>
          <li>
            If a payment fails (for example a wrong PIN, timeout or insufficient balance), no money is taken and you can
            try again from your orders page.
          </li>
          <li>Payments are processed by Safaricom. We don&apos;t see or store your M-Pesa PIN.</li>
        </ul>
      </>
    ),
  },
  {
    id: "delivery",
    title: "Delivery and collection",
    body: (
      <>
        <p>
          We deliver to the campus drop point you choose at checkout. Delivery is free on orders of{" "}
          {formatKes(FREE_DELIVERY_THRESHOLD)} or more; below that, a {formatKes(DELIVERY_FEE)} delivery fee applies and
          is shown before you pay.
        </p>
        <p>
          Delivery times we give are estimates. Please be reachable on your phone around delivery time. If we can&apos;t
          reach you after reasonable attempts, we&apos;ll hold the order and agree a new time with you.
        </p>
        <p>Once an order is handed to you or the person you nominate, it&apos;s your responsibility.</p>
      </>
    ),
  },
  {
    id: "cancellations",
    title: "Cancellations, returns and refunds",
    body: (
      <>
        <p>
          You can cancel an unpaid order yourself within 5 minutes of placing it. After that, or once it&apos;s paid,
          contact us and we&apos;ll help if the order hasn&apos;t been dispatched.
        </p>
        <p>
          If an item arrives damaged, faulty or not as described, tell us within 48 hours of receiving it, with photos
          if you can. We&apos;ll replace it or refund you.
        </p>
        <p>
          For hygiene reasons, opened or used perfumes, cosmetics and beauty products can&apos;t be returned unless they
          are faulty. Other items can be returned within 7 days if unused, in original condition and packaging.
        </p>
        <p>
          Approved refunds are paid back to the M-Pesa number you paid from, normally within 7 working days. Nothing in
          these Terms limits your rights under the Consumer Protection Act, 2012.
        </p>
      </>
    ),
  },
  {
    id: "points",
    title: "Kelmon Points",
    body: (
      <>
        <p>
          Signed-in customers earn Kelmon Points on paid orders. Points have no cash value, can&apos;t be transferred
          or exchanged for money, and are removed if the order they came from is refunded or cancelled.
        </p>
        <p>We may change how points are earned or redeemed, or end the programme, with reasonable notice.</p>
      </>
    ),
  },
  {
    id: "conduct",
    title: "Using the site fairly",
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>use Kelmon for anything unlawful, fraudulent or harmful;</li>
          <li>place fake orders, use someone else&apos;s M-Pesa number without permission, or abuse promotions;</li>
          <li>post reviews that are false, offensive, or that you were paid to write;</li>
          <li>try to break, overload, scrape or get unauthorised access to the site or its systems;</li>
          <li>copy our photos, text or branding without permission.</li>
        </ul>
        <p>We may suspend or close accounts that break these rules.</p>
      </>
    ),
  },
  {
    id: "content",
    title: "Reviews and content you share",
    body: (
      <p>
        When you post a review or send us a message, you keep ownership of it but let us display and use it on Kelmon
        (for example, showing your review on a product page with your first name). We may remove content that breaks
        these Terms.
      </p>
    ),
  },
  {
    id: "ip",
    title: "Our content and brands",
    body: (
      <p>
        The Kelmon name, logo, site design, photos and text belong to Kelmon or its licensors. Product brand names
        belong to their respective owners and are used only to describe the products we sell.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Our responsibility to you",
    body: (
      <>
        <p>
          We&apos;ll provide our service with reasonable care and skill. We&apos;re not responsible for losses that
          weren&apos;t foreseeable, delays caused by events outside our control (such as network or M-Pesa outages,
          strikes or severe weather), or misuse of products.
        </p>
        <p>
          Where the law allows, our total liability for any order is limited to the amount you paid for it. Nothing here
          excludes liability that can&apos;t legally be excluded.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these Terms from time to time. The date at the top shows the latest version. If a change is
        significant, we&apos;ll let you know on the site or by email, and may ask you to accept the new version.
        Orders already placed follow the Terms that applied when you ordered.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These Terms are governed by the laws of Kenya. If there&apos;s a dispute, please contact us first — most things
        can be sorted quickly. If not, the courts of Kenya will have jurisdiction.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        Questions about these Terms? Reach us through our{" "}
        <Link href={LEGAL_CONTACT.contactPage} className={link}>
          contact page
        </Link>{" "}
        or on WhatsApp at{" "}
        <a href={LEGAL_CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer" className={link}>
          {LEGAL_CONTACT.whatsapp}
        </a>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      sections={sections}
      other={{ href: "/privacy", label: "Privacy Policy" }}
    />
  );
}
