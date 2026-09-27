/** Curated avatar library for guest profiles */

export interface AvatarOption {
  id: string;
  label: string;
  src: string;
}

export const DEFAULT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAo59KXigRDLkS4eNERCgiCQtsQI2IqYnmzXqQtsLNKcPhpc1gO_4Im4Czek3LciVZ8Zf9JOzOVrWIsdRJaQUGZOVxdK97Tx4LMU5CoHRUfVPNjipfC3tlRE9ZrFxwZFHjbmg7s9iMw15y-hiU8sWZu7yeDXGbYrIhDhP6OSW-8rq_EcVQ6V6synulhAKCtkkDam9KJ4n9DXBOkxNM-q-gTKjlcTcnlp9bVgHd9yLa1pl-cI7vW-_tu";

function solidAvatar(bg: string, letter: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="${bg}"/><text x="128" y="148" text-anchor="middle" font-family="Georgia,serif" font-size="96" fill="#ffffff">${letter}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const avatarLibrary: AvatarOption[] = [
  {
    id: "silk",
    label: "Silk vibe",
    src: DEFAULT_AVATAR,
  },
  {
    id: "scent",
    label: "Scent",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAy8kl7sj6JdUBHPI0F3ytpMSyFHEfIL9ezXsjnlf20d5-DCeOaOJmn0JJapvsKA3dp8ddtbbRh2he9r91WEHiaU7N3cUjtEWlY-dEyzmLg8bg3qknte3NxDzPqHYL3dSE9WmQM5VnSA6Z0a3DaDQ0aIpEoj-wtFu8PzZebkULyT6SYOuxM17AhZI41yxFrc9WHrj0KMa8Qg_6wsNEL6LlBNSe8oz8crvpcJsUz9BEM_fCyiTUBtWMJ",
  },
  {
    id: "bag",
    label: "Bag era",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCVWalppuGMjKswUbfn0gKwdvM6wzNBWcP47HWqUNmJiz7YxZH0dbcOXpksDrTRIrY1pzj5du3TMTobGthcdBPNIk9GJPTepo95s-qqwNVuyMmxRtreJrXlCR8MrlKVd44jG7saJGBpNKMefr_8yxgnrkPe1ak7cJPraUVryoY8xQH0ZRB7NQW00wA0Gzt0tviTdc_f8ZbzHBQ1CzqrQsALURf660Tusr9l3b0MV6k5ujgGfVL2Nn6j",
  },
  {
    id: "nails",
    label: "Nails",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDJu5zdQkwzbDi5vESHyMGriik8Z0fW33h13tdGMdfYq_jChZb6DU6NQkb2mvO02ZaD6_WNtNO9aHj9jCOh-dNT2Btq6NSSTqjpukwYPj-mn0ILREdV09_RcHRf3oNGvQ-a4q7vkKZ_WJDyaNaN12bvjGLgpEB6F1IgDXn2FV1-09FzwBuCsrb6z2T4Onacw7ymLd3Fl6-pkdrtRHWWlldx9DKEnQIw_es8iv6KQd6vBOaDFgszcSSY",
  },
  {
    id: "gold",
    label: "Gold",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDaoBqKyrShvsU0LpmYQbIN1L_RvJXl36PLr8QsBRVEoALjG3OJfsUpx4ASQjMC2n_TgtyC1k_7_fpDQXN_z4rOGaNTzbg0KhdvSF9NRlFiaShD3KXgNOUYXJNo5Zgp2Nu7ag_35EwhNoAwBY_tWB1wWT-Zz9grNiScztqFmakQq9LjYoutwZpN2GO3l1Tz8bwifgxvVxf1ZorPaj3qZ3Haz6iLcyFAY6fsQYXXbWSeqTFKMHun9lQH",
  },
  {
    id: "crossbody",
    label: "On the go",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBMXUILIEmeN2vV2l8fp8_34rPu0T0rKxow98dTsqBSwPQOoGciIjjgU6jsrQebMpLbqOvBWvsytNqM1DQo3GGmGv9Oki6wnR_af2jtsBQcvGxiOKDCyu9bS_ejnm-l9VKoXlWkKmq9QDvvNtnueSimnq-V-tYzklV_EKKncqLM_hhTp0xdpUp0Shb7pLdZcoiGj_e51e7WyX3R0diDGEA33cIiF6UrRhnFCjFKjl10I0smMQtESlIA",
  },
  {
    id: "glam",
    label: "Glam",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAy8kl7sj6JdUBHPI0F3ytpMSyFHEfIL9ezXsjnlf20d5-DCeOaOJmn0JJapvsKA3dp8ddtbbRh2he9r91WEHiaU7N3cUjtEWlY-dEyzmLg8bg3qknte3NxDzPqHYL3dSE9WmQM5VnSA6Z0a3DaDQ0aIpEoj-wtFu8PzZebkULyT6SYOuxM17AhZI41yxFrc9WHrj0KMa8Qg_6wsNEL6LlBNSe8oz8crvpcJsUz9BEM_fCyiTUBtWMJ",
  },
  {
    id: "polish",
    label: "Polish",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZ2wByUuPKXGJcMlqBE3OI1bvOps6JnL_h7fMWQeBUnxLlrFCha17-boQvw_6qETmK72SD3Ihse9c9wL_5uiuwwSWg7x12BYrZcqH7QhOUtR3udyVFYNSBuTr-EyQDeUxL7zJO6S7u_mmcOD5XAQMJnizK1JabLJTrjNYmgrvQX4yOXHcVL9ifz8aSSghP8sLYkaScHQVHRrv2UXPTaPkJXJkQBV6hHVjxl3oOzo48OoFcQn2g4ICd",
  },
  { id: "letter-k", label: "K", src: solidAvatar("#8E44AD", "K") },
  { id: "letter-g", label: "G", src: solidAvatar("#C5A059", "G") },
  { id: "letter-s", label: "S", src: solidAvatar("#6B2D7B", "S") },
  { id: "letter-m", label: "M", src: solidAvatar("#2D1B36", "M") },
];

/** Resize + compress a user photo for localStorage */
export function fileToAvatarDataUrl(file: File, maxSize = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Image is too large (max 8MB)."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Could not load that image."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process image."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
