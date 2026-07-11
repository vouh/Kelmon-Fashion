export interface SalonService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  icon: string;
  image: string;
}

export const salonServices: SalonService[] = [
  {
    id: "gel-manicure",
    name: "Gel manicure",
    description: "Long-wear gel polish, shape, and cuticle care — campus glam that lasts.",
    price: 1500,
    duration: "45 min",
    icon: "brush",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDJu5zdQkwzbDi5vESHyMGriik8Z0fW33h13tdGMdfYq_jChZb6DU6NQkb2mvO02ZaD6_WNtNO9aHj9jCOh-dNT2Btq6NSSTqjpukwYPj-mn0ILREdV09_RcHRf3oNGvQ-a4q7vkKZ_WJDyaNaN12bvjGLgpEB6F1IgDXn2FV1-09FzwBuCsrb6z2T4Onacw7ymLd3Fl6-pkdrtRHWWlldx9DKEnQIw_es8iv6KQd6vBOaDFgszcSSY",
  },
  {
    id: "gel-pedicure",
    name: "Gel pedicure",
    description: "Foot soak, scrub, and gel color for soft, polished feet.",
    price: 2000,
    duration: "60 min",
    icon: "spa",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDZ2wByUuPKXGJcMlqBE3OI1bvOps6JnL_h7fMWQeBUnxLlrFCha17-boQvw_6qETmK72SD3Ihse9c9wL_5uiuwwSWg7x12BYrZcqH7QhOUtR3udyVFYNSBuTr-EyQDeUxL7zJO6S7u_mmcOD5XAQMJnizK1JabLJTrjNYmgrvQX4yOXHcVL9ifz8aSSghP8sLYkaScHQVHRrv2UXPTaPkJXJkQBV6hHVjxl3oOzo48OoFcQn2g4ICd",
  },
  {
    id: "nail-art",
    name: "Nail art add-on",
    description: "Simple designs, chrome, or accents on top of your gel set.",
    price: 500,
    duration: "15 min",
    icon: "auto_awesome",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDaoBqKyrShvsU0LpmYQbIN1L_RvJXl36PLr8QsBRVEoALjG3OJfsUpx4ASQjMC2n_TgtyC1k_7_fpDQXN_z4rOGaNTzbg0KhdvSF9NRlFiaShD3KXgNOUYXJNo5Zgp2Nu7ag_35EwhNoAwBY_tWB1wWT-Zz9grNiScztqFmakQq9LjYoutwZpN2GO3l1Tz8bwifgxvVxf1ZorPaj3qZ3Haz6iLcyFAY6fsQYXXbWSeqTFKMHun9lQH",
  },
  {
    id: "fill-in",
    name: "Gel fill-in",
    description: "Maintain your set with a clean fill and fresh top coat.",
    price: 1200,
    duration: "40 min",
    icon: "replay",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDJu5zdQkwzbDi5vESHyMGriik8Z0fW33h13tdGMdfYq_jChZb6DU6NQkb2mvO02ZaD6_WNtNO9aHj9jCOh-dNT2Btq6NSSTqjpukwYPj-mn0ILREdV09_RcHRf3oNGvQ-a4q7vkKZ_WJDyaNaN12bvjGLgpEB6F1IgDXn2FV1-09FzwBuCsrb6z2T4Onacw7ymLd3Fl6-pkdrtRHWWlldx9DKEnQIw_es8iv6KQd6vBOaDFgszcSSY",
  },
  {
    id: "lash-lift",
    name: "Lash lift & tint",
    description: "Lifted lashes with a soft tint — wake-up-ready glam.",
    price: 2500,
    duration: "50 min",
    icon: "visibility",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAo59KXigRDLkS4eNERCgiCQtsQI2IqYnmzXqQtsLNKcPhpc1gO_4Im4Czek3LciVZ8Zf9JOzOVrWIsdRJaQUGZOVxdK97Tx4LMU5CoHRUfVPNjipfC3tlRE9ZrFxwZFHjbmg7s9iMw15y-hiU8sWZu7yeDXGbYrIhDhP6OSW-8rq_EcVQ6V6synulhAKCtkkDam9KJ4n9DXBOkxNM-q-gTKjlcTcnlp9bVgHd9yLa1pl-cI7vW-_tu",
  },
  {
    id: "brow-shape",
    name: "Brow shape & tint",
    description: "Clean arch, tint, and groom for a polished everyday look.",
    price: 1000,
    duration: "25 min",
    icon: "face",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBMXUILIEmeN2vV2l8fp8_34rPu0T0rKxow98dTsqBSwPQOoGciIjjgU6jsrQebMpLbqOvBWvsytNqM1DQo3GGmGv9Oki6wnR_af2jtsBQcvGxiOKDCyu9bS_ejnm-l9VKoXlWkKmq9QDvvNtnueSimnq-V-tYzklV_EKKncqLM_hhTp0xdpUp0Shb7pLdZcoiGj_e51e7WyX3R0diDGEA33cIiF6UrRhnFCjFKjl10I0smMQtESlIA",
  },
  {
    id: "glam-makeup",
    name: "Glam makeup",
    description: "Full face for events, shoots, or nights out on campus.",
    price: 3500,
    duration: "60 min",
    icon: "brush",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAy8kl7sj6JdUBHPI0F3ytpMSyFHEfIL9ezXsjnlf20d5-DCeOaOJmn0JJapvsKA3dp8ddtbbRh2he9r91WEHiaU7N3cUjtEWlY-dEyzmLg8bg3qknte3NxDzPqHYL3dSE9WmQM5VnSA6Z0a3DaDQ0aIpEoj-wtFu8PzZebkULyT6SYOuxM17AhZI41yxFrc9WHrj0KMa8Qg_6wsNEL6LlBNSe8oz8crvpcJsUz9BEM_fCyiTUBtWMJ",
  },
  {
    id: "soft-glam",
    name: "Soft glam makeup",
    description: "Natural glow makeup for lectures, dates, and daytime events.",
    price: 2500,
    duration: "45 min",
    icon: "favorite",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCVWalppuGMjKswUbfn0gKwdvM6wzNBWcP47HWqUNmJiz7YxZH0dbcOXpksDrTRIrY1pzj5du3TMTobGthcdBPNIk9GJPTepo95s-qqwNVuyMmxRtreJrXlCR8MrlKVd44jG7saJGBpNKMefr_8yxgnrkPe1ak7cJPraUVryoY8xQH0ZRB7NQW00wA0Gzt0tviTdc_f8ZbzHBQ1CzqrQsALURf660Tusr9l3b0MV6k5ujgGfVL2Nn6j",
  },
];
