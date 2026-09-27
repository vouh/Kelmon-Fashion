/**
 * Sample data for local review, served only when the dev fallback is active
 * (no Supabase configured, not a production build — see lib/dev-auth.ts).
 *
 * This exists so the admin panel and storefront are browsable before a database
 * is set up. Once real Supabase keys land in .env.local, every read below is
 * bypassed and the real tables are used instead.
 */

import type { Product } from "@/lib/products";
import type { SalonService } from "@/lib/salon";
import type { OrderWithItems } from "@/lib/supabase/orders";
import type { DealRow, ReviewRow, UpdateRow } from "@/lib/supabase/types";

const IMG = {
  perfume:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAy8kl7sj6JdUBHPI0F3ytpMSyFHEfIL9ezXsjnlf20d5-DCeOaOJmn0JJapvsKA3dp8ddtbbRh2he9r91WEHiaU7N3cUjtEWlY-dEyzmLg8bg3qknte3NxDzPqHYL3dSE9WmQM5VnSA6Z0a3DaDQ0aIpEoj-wtFu8PzZebkULyT6SYOuxM17AhZI41yxFrc9WHrj0KMa8Qg_6wsNEL6LlBNSe8oz8crvpcJsUz9BEM_fCyiTUBtWMJ",
  bag: "https://lh3.googleusercontent.com/aida-public/AB6AXuCVWalppuGMjKswUbfn0gKwdvM6wzNBWcP47HWqUNmJiz7YxZH0dbcOXpksDrTRIrY1pzj5du3TMTobGthcdBPNIk9GJPTepo95s-qqwNVuyMmxRtreJrXlCR8MrlKVd44jG7saJGBpNKMefr_8yxgnrkPe1ak7cJPraUVryoY8xQH0ZRB7NQW00wA0Gzt0tviTdc_f8ZbzHBQ1CzqrQsALURf660Tusr9l3b0MV6k5ujgGfVL2Nn6j",
  nails:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDJu5zdQkwzbDi5vESHyMGriik8Z0fW33h13tdGMdfYq_jChZb6DU6NQkb2mvO02ZaD6_WNtNO9aHj9jCOh-dNT2Btq6NSSTqjpukwYPj-mn0ILREdV09_RcHRf3oNGvQ-a4q7vkKZ_WJDyaNaN12bvjGLgpEB6F1IgDXn2FV1-09FzwBuCsrb6z2T4Onacw7ymLd3Fl6-pkdrtRHWWlldx9DKEnQIw_es8iv6KQd6vBOaDFgszcSSY",
  fashion:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDaoBqKyrShvsU0LpmYQbIN1L_RvJXl36PLr8QsBRVEoALjG3OJfsUpx4ASQjMC2n_TgtyC1k_7_fpDQXN_z4rOGaNTzbg0KhdvSF9NRlFiaShD3KXgNOUYXJNo5Zgp2Nu7ag_35EwhNoAwBY_tWB1wWT-Zz9grNiScztqFmakQq9LjYoutwZpN2GO3l1Tz8bwifgxvVxf1ZorPaj3qZ3Haz6iLcyFAY6fsQYXXbWSeqTFKMHun9lQH",
  scarf:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAo59KXigRDLkS4eNERCgiCQtsQI2IqYnmzXqQtsLNKcPhpc1gO_4Im4Czek3LciVZ8Zf9JOzOVrWIsdRJaQUGZOVxdK97Tx4LMU5CoHRUfVPNjipfC3tlRE9ZrFxwZFHjbmg7s9iMw15y-hiU8sWZu7yeDXGbYrIhDhP6OSW-8rq_EcVQ6V6synulhAKCtkkDam9KJ4n9DXBOkxNM-q-gTKjlcTcnlp9bVgHd9yLa1pl-cI7vW-_tu",
  pedicure:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDZ2wByUuPKXGJcMlqBE3OI1bvOps6JnL_h7fMWQeBUnxLlrFCha17-boQvw_6qETmK72SD3Ihse9c9wL_5uiuwwSWg7x12BYrZcqH7QhOUtR3udyVFYNSBuTr-EyQDeUxL7zJO6S7u_mmcOD5XAQMJnizK1JabLJTrjNYmgrvQX4yOXHcVL9ifz8aSSghP8sLYkaScHQVHRrv2UXPTaPkJXJkQBV6hHVjxl3oOzo48OoFcQn2g4ICd",
};

/** Hours ago as an ISO string, so the 7-day charts have something to plot. */
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

export const devProducts: Product[] = [
  {
    id: "chanel-no5-mini",
    name: "Chanel No.5 Mini",
    price: 2500,
    category: "Perfumes",
    image: IMG.perfume,
    images: [IMG.perfume],
    rating: 4.8,
    reviewCount: 124,
    badge: "New",
    description: "The icon, travel-sized. A floral-aldehyde classic.",
    sizes: ["30ml", "50ml", "100ml"],
    colors: [],
    stock: 24,
  },
  {
    id: "lv-speedy-bag",
    name: "LV Speedy Bag",
    price: 8500,
    originalPrice: 9800,
    category: "Bags",
    image: IMG.bag,
    images: [IMG.bag],
    rating: 4.9,
    reviewCount: 56,
    badge: "Hot",
    description: "Structured top-handle bag with room for a laptop.",
    sizes: [],
    colors: ["Black", "Brown", "Cream"],
    stock: 8,
  },
  {
    id: "gel-manicure-kit",
    name: "Gel Manicure Kit",
    price: 1200,
    category: "Nails",
    image: IMG.nails,
    images: [IMG.nails],
    rating: 4.5,
    reviewCount: 15,
    description: "Everything for an at-home gel set.",
    sizes: [],
    colors: ["Nude", "Bold", "Classic"],
    stock: 30,
  },
  {
    id: "gold-hoop-earrings",
    name: "Gold Hoop Earrings",
    price: 850,
    originalPrice: 1100,
    category: "Fashion",
    image: IMG.fashion,
    images: [IMG.fashion],
    rating: 4.8,
    reviewCount: 210,
    badge: "Sale",
    description: "Tarnish-resistant hoops that go with everything.",
    sizes: ["S", "M", "L"],
    colors: [],
    stock: 40,
  },
  {
    id: "silk-scarf",
    name: "Silk Scarf",
    price: 1800,
    category: "Fashion",
    image: IMG.scarf,
    images: [IMG.scarf],
    rating: 5,
    reviewCount: 68,
    description: "Wear it in your hair, on your bag, or at your neck.",
    sizes: ["S", "M", "L"],
    colors: [],
    stock: 18,
  },
  {
    id: "dior-sauvage",
    name: "Dior Sauvage 100ml",
    price: 4800,
    originalPrice: 5500,
    category: "Perfumes",
    image: IMG.perfume,
    images: [IMG.perfume],
    rating: 5,
    reviewCount: 89,
    badge: "Sale",
    description: "Fresh, peppery, and hard to miss.",
    sizes: ["30ml", "50ml", "100ml"],
    colors: [],
    stock: 15,
  },
];

export const devSalonServices: SalonService[] = [
  {
    id: "gel-manicure",
    name: "Gel manicure",
    description: "Long-wear gel polish, shape, and cuticle care.",
    price: 1500,
    duration: "45 min",
    icon: "brush",
    image: IMG.nails,
  },
  {
    id: "gel-pedicure",
    name: "Gel pedicure",
    description: "Foot soak, scrub, and gel color for polished feet.",
    price: 2000,
    duration: "60 min",
    icon: "spa",
    image: IMG.pedicure,
  },
  {
    id: "lash-lift",
    name: "Lash lift & tint",
    description: "Lifted lashes with a soft tint.",
    price: 2500,
    duration: "50 min",
    icon: "visibility",
    image: IMG.scarf,
  },
  {
    id: "glam-makeup",
    name: "Glam makeup",
    description: "Full face for events, shoots, or big nights.",
    price: 3500,
    duration: "60 min",
    icon: "brush",
    image: IMG.perfume,
  },
];

interface SeedOrder {
  id: string;
  name: string;
  phone: string;
  drop: string;
  hours: number;
  status: OrderWithItems["status"];
  payment: OrderWithItems["payment_status"];
  receipt?: string;
  failure?: string;
  items: { name: string; qty: number; price: number; variant?: string; id: string }[];
}

const SEED: SeedOrder[] = [
  {
    id: "KM-TEST001",
    name: "Amina Wanjiru",
    phone: "0712345678",
    drop: "UoN Main Campus — Gate C",
    hours: 2,
    status: "confirmed",
    payment: "paid",
    receipt: "SJH4K2L9AA",
    items: [{ id: "lv-speedy-bag", name: "LV Speedy Bag", qty: 1, price: 8500, variant: "Black" }],
  },
  {
    id: "KM-TEST002",
    name: "Brian Otieno",
    phone: "0723456789",
    drop: "Kenyatta University — Hostel B",
    hours: 6,
    status: "packed",
    payment: "paid",
    receipt: "SJH4K3M1BB",
    items: [
      { id: "chanel-no5-mini", name: "Chanel No.5 Mini", qty: 1, price: 2500, variant: "50ml" },
      { id: "gold-hoop-earrings", name: "Gold Hoop Earrings", qty: 2, price: 850, variant: "M" },
    ],
  },
  {
    id: "KM-TEST003",
    name: "Cynthia Mwikali",
    phone: "0734567890",
    drop: "Strathmore — Student Centre",
    hours: 20,
    status: "pending",
    payment: "unpaid",
    items: [{ id: "gel-manicure-kit", name: "Gel Manicure Kit", qty: 1, price: 1200, variant: "Nude" }],
  },
  {
    id: "KM-TEST004",
    name: "Daniel Kimani",
    phone: "0745678901",
    drop: "JKUAT — Juja Gate",
    hours: 28,
    status: "pending",
    payment: "failed",
    failure: "Request cancelled by user",
    items: [{ id: "dior-sauvage", name: "Dior Sauvage 100ml", qty: 1, price: 4800, variant: "100ml" }],
  },
  {
    id: "KM-TEST005",
    name: "Esther Njeri",
    phone: "0756789012",
    drop: "UoN Kikuyu Campus",
    hours: 50,
    status: "delivered",
    payment: "paid",
    receipt: "SJH4K5N2CC",
    items: [
      { id: "silk-scarf", name: "Silk Scarf", qty: 1, price: 1800, variant: "M" },
      { id: "gel-manicure-kit", name: "Gel Manicure Kit", qty: 1, price: 1200, variant: "Bold" },
    ],
  },
  {
    id: "KM-TEST006",
    name: "Faith Chebet",
    phone: "0767890123",
    drop: "Road sale",
    hours: 74,
    status: "delivered",
    payment: "paid",
    receipt: "SJH4K6P3DD",
    items: [{ id: "gold-hoop-earrings", name: "Gold Hoop Earrings", qty: 3, price: 850, variant: "S" }],
  },
  {
    id: "KM-TEST007",
    name: "George Mutua",
    phone: "0778901234",
    drop: "Multimedia University",
    hours: 96,
    status: "awaiting_mpesa",
    payment: "initiated",
    items: [{ id: "lv-speedy-bag", name: "LV Speedy Bag", qty: 1, price: 8500, variant: "Cream" }],
  },
  {
    id: "KM-TEST008",
    name: "Hellen Akinyi",
    phone: "0789012345",
    drop: "USIU — Main Gate",
    hours: 120,
    status: "cancelled",
    payment: "unpaid",
    items: [{ id: "silk-scarf", name: "Silk Scarf", qty: 1, price: 1800 }],
  },
];

export const devOrders: OrderWithItems[] = SEED.map((seed, index) => {
  const subtotal = seed.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = subtotal >= 3000 ? 0 : 150;
  const created = hoursAgo(seed.hours);

  return {
    id: seed.id,
    user_id: null,
    customer_name: seed.name,
    phone: seed.phone,
    drop_point: seed.drop,
    campus: null,
    notes: index === 2 ? "Please call on arrival." : null,
    payment_method: "mpesa",
    subtotal,
    delivery_fee: deliveryFee,
    total: subtotal + deliveryFee,
    status: seed.status,
    payment_status: seed.payment,
    source: seed.drop === "Road sale" ? "admin_direct" : "storefront",
    mpesa_checkout_request_id: seed.receipt ? `ws_CO_${seed.id}` : null,
    mpesa_merchant_request_id: seed.receipt ? `mr_${seed.id}` : null,
    mpesa_receipt_number: seed.receipt ?? null,
    mpesa_result_desc: seed.failure ?? (seed.receipt ? "The service request is processed successfully." : null),
    mpesa_phone: seed.phone.replace(/^0/, "254"),
    points_awarded: seed.payment === "paid",
    points_earned: seed.payment === "paid" ? (subtotal >= 5000 ? 50 : subtotal >= 1000 ? 20 : 5) : 0,
    created_at: created,
    updated_at: created,
    order_items: seed.items.map((item, i) => ({
      id: `${seed.id}-item-${i}`,
      order_id: seed.id,
      product_id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.qty,
      variant: item.variant ?? null,
      image: null,
      category: null,
    })),
  };
});

export const devReviews: ReviewRow[] = [
  {
    id: "rev-1",
    user_id: null,
    product_id: "lv-speedy-bag",
    author_name: "Amina W.",
    rating: 5,
    body: "Bag is even better in person. Fits my laptop and notes easily.",
    created_at: hoursAgo(4),
  },
  {
    id: "rev-2",
    user_id: null,
    product_id: "chanel-no5-mini",
    author_name: "Brian O.",
    rating: 4,
    body: "Lasts all day. Wish the bottle were slightly bigger.",
    created_at: hoursAgo(26),
  },
  {
    id: "rev-3",
    user_id: null,
    product_id: "gold-hoop-earrings",
    author_name: "Cynthia M.",
    rating: 5,
    body: "No tarnish after weeks of daily wear. Worth it.",
    created_at: hoursAgo(52),
  },
  {
    id: "rev-4",
    user_id: null,
    product_id: "gel-manicure-kit",
    author_name: "Daniel K.",
    rating: 3,
    body: "Decent kit but the top coat took ages to cure.",
    created_at: hoursAgo(78),
  },
  {
    id: "rev-5",
    user_id: null,
    product_id: "silk-scarf",
    author_name: "Esther N.",
    rating: 5,
    body: "Three looks from one scarf, exactly as advertised.",
    created_at: hoursAgo(101),
  },
  {
    id: "rev-6",
    user_id: null,
    product_id: "dior-sauvage",
    author_name: "George M.",
    rating: 2,
    body: "Delivery was slow and the box arrived dented.",
    created_at: hoursAgo(130),
  },
];

export const devDeals: DealRow[] = [
  {
    id: "deal-1",
    title: "Freshers Week — 20% off bags",
    description: "First two weeks of the semester. Applies to all bags.",
    image: IMG.bag,
    code: "FRESHERS20",
    discount_percent: 20,
    starts_at: hoursAgo(72),
    ends_at: hoursAgo(-168),
    active: true,
    created_at: hoursAgo(72),
  },
  {
    id: "deal-2",
    title: "Free delivery over KES 3,000",
    description: "Standing offer on every campus drop point.",
    image: null,
    code: null,
    discount_percent: null,
    starts_at: hoursAgo(400),
    ends_at: null,
    active: true,
    created_at: hoursAgo(400),
  },
  {
    id: "deal-3",
    title: "Nails bundle — kit + polish",
    description: "Buy a manicure kit and get the polish set half price.",
    image: IMG.nails,
    code: "NAILS50",
    discount_percent: 50,
    starts_at: hoursAgo(200),
    ends_at: hoursAgo(-48),
    active: true,
    created_at: hoursAgo(200),
  },
];

export const devUpdates: UpdateRow[] = [
  {
    id: "upd-1",
    title: "M-Pesa checkout is live",
    body: "You can now pay straight from the app with an STK push. No more sending to a till manually.",
    tag: "feature",
    created_at: hoursAgo(8),
  },
  {
    id: "upd-2",
    title: "Restocked: LV Speedy Bag",
    body: "Back in Black, Brown and Cream. Limited units this round.",
    tag: "restock",
    created_at: hoursAgo(40),
  },
  {
    id: "upd-3",
    title: "Salon booking coming soon",
    body: "Nails, lashes and brows will be bookable from the app shortly. Join the waitlist on the salon page.",
    tag: "news",
    created_at: hoursAgo(96),
  },
];
