export type NavItem = "home" | "shop" | "salon" | "cart" | "orders" | "profile" | "about";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  badge?: string;
  originalPrice?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: string;
}

export const featuredProducts: Product[] = [
  {
    id: "chanel-no5-mini",
    name: "Chanel No.5 Mini",
    price: 2500,
    category: "Perfumes",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAy8kl7sj6JdUBHPI0F3ytpMSyFHEfIL9ezXsjnlf20d5-DCeOaOJmn0JJapvsKA3dp8ddtbbRh2he9r91WEHiaU7N3cUjtEWlY-dEyzmLg8bg3qknte3NxDzPqHYL3dSE9WmQM5VnSA6Z0a3DaDQ0aIpEoj-wtFu8PzZebkULyT6SYOuxM17AhZI41yxFrc9WHrj0KMa8Qg_6wsNEL6LlBNSe8oz8crvpcJsUz9BEM_fCyiTUBtWMJ",
    rating: 4.8,
    reviewCount: 124,
    badge: "New",
  },
  {
    id: "lv-speedy-bag",
    name: "LV Speedy Bag",
    price: 8500,
    category: "Bags",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCVWalppuGMjKswUbfn0gKwdvM6wzNBWcP47HWqUNmJiz7YxZH0dbcOXpksDrTRIrY1pzj5du3TMTobGthcdBPNIk9GJPTepo95s-qqwNVuyMmxRtreJrXlCR8MrlKVd44jG7saJGBpNKMefr_8yxgnrkPe1ak7cJPraUVryoY8xQH0ZRB7NQW00wA0Gzt0tviTdc_f8ZbzHBQ1CzqrQsALURf660Tusr9l3b0MV6k5ujgGfVL2Nn6j",
    rating: 4.9,
    reviewCount: 56,
  },
  {
    id: "gel-manicure-kit",
    name: "Gel Manicure Kit",
    price: 1200,
    category: "Nails",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDJu5zdQkwzbDi5vESHyMGriik8Z0fW33h13tdGMdfYq_jChZb6DU6NQkb2mvO02ZaD6_WNtNO9aHj9jCOh-dNT2Btq6NSSTqjpukwYPj-mn0ILREdV09_RcHRf3oNGvQ-a4q7vkKZ_WJDyaNaN12bvjGLgpEB6F1IgDXn2FV1-09FzwBuCsrb6z2T4Onacw7ymLd3Fl6-pkdrtRHWWlldx9DKEnQIw_es8iv6KQd6vBOaDFgszcSSY",
    rating: 4.5,
    reviewCount: 15,
  },
];

export const shopProducts: Product[] = [
  ...featuredProducts,
  {
    id: "dior-sauvage",
    name: "Dior Sauvage 100ml",
    price: 4800,
    category: "Perfumes",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAdRyLQb2S_yuMJ59w5MyYSxLNBH8sbWVYkGfpdzxEV7hfB2f36365XFtJZF4YyN8MACrE9ahUb1tCZuj_JAljiWDFmnBShFO01-Up_T2_gB0EkllsyjMI8iobp8W6x2qR8DgAx564yiul2wNUnUUjvKd6Fj2KX3wlDfv3Qy3Gz3BQn2aSdMdW311tqwSaoAU2L1fSZBO9aENtMo7Mly5jXC8Qdwg-7reAjGnQv9OqvgaxMWt2M0eKJ",
    rating: 5,
    reviewCount: 89,
  },
  {
    id: "crossbody-mini-bag",
    name: "Crossbody Mini Bag",
    price: 3200,
    category: "Bags",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBMXUILIEmeN2vV2l8fp8_34rPu0T0rKxow98dTsqBSwPQOoGciIjjgU6jsrQebMpLbqOvBWvsytNqM1DQo3GGmGv9Oki6wnR_af2jtsBQcvGxiOKDCyu9bS_ejnm-l9VKoXlWkKmq9QDvvNtnueSimnq-V-tYzklV_EKKncqLM_hhTp0xdpUp0Shb7pLdZcoiGj_e51e7WyX3R0diDGEA33cIiF6UrRhnFCjFKjl10I0smMQtESlIA",
    rating: 4,
    reviewCount: 42,
  },
  {
    id: "gold-hoop-earrings",
    name: "Gold Hoop Earrings",
    price: 850,
    originalPrice: 1100,
    category: "Fashion",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDaoBqKyrShvsU0LpmYQbIN1L_RvJXl36PLr8QsBRVEoALjG3OJfsUpx4ASQjMC2n_TgtyC1k_7_fpDQXN_z4rOGaNTzbg0KhdvSF9NRlFiaShD3KXgNOUYXJNo5Zgp2Nu7ag_35EwhNoAwBY_tWB1wWT-Zz9grNiScztqFmakQq9LjYoutwZpN2GO3l1Tz8bwifgxvVxf1ZorPaj3qZ3Haz6iLcyFAY6fsQYXXbWSeqTFKMHun9lQH",
    rating: 4.8,
    reviewCount: 210,
    badge: "Sale",
  },
  {
    id: "gel-polish-set",
    name: "Gel Polish Set",
    price: 1200,
    category: "Nails",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDZ2wByUuPKXGJcMlqBE3OI1bvOps6JnL_h7fMWQeBUnxLlrFCha17-boQvw_6qETmK72SD3Ihse9c9wL_5uiuwwSWg7x12BYrZcqH7QhOUtR3udyVFYNSBuTr-EyQDeUxL7zJO6S7u_mmcOD5XAQMJnizK1JabLJTrjNYmgrvQX4yOXHcVL9ifz8aSSghP8sLYkaScHQVHRrv2UXPTaPkJXJkQBV6hHVjxl3oOzo48OoFcQn2g4ICd",
    rating: 4,
    reviewCount: 15,
  },
  {
    id: "silk-scarf",
    name: "Silk Scarf",
    price: 1800,
    category: "Fashion",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAo59KXigRDLkS4eNERCgiCQtsQI2IqYnmzXqQtsLNKcPhpc1gO_4Im4Czek3LciVZ8Zf9JOzOVrWIsdRJaQUGZOVxdK97Tx4LMU5CoHRUfVPNjipfC3tlRE9ZrFxwZFHjbmg7s9iMw15y-hiU8sWZu7yeDXGbYrIhDhP6OSW-8rq_EcVQ6V6synulhAKCtkkDam9KJ4n9DXBOkxNM-q-gTKjlcTcnlp9bVgHd9yLa1pl-cI7vW-_tu",
    rating: 5,
    reviewCount: 68,
  },
];

export const categories = ["Bags", "Perfumes", "Fashion", "Nails"];

export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function getProductById(id: string): Product | undefined {
  return shopProducts.find((p) => p.id === id);
}
