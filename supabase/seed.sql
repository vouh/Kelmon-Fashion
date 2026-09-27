-- ============================================================================
-- Kelmon Fashion — seed data
--
-- Products are lifted from the hardcoded arrays in lib/products.ts, and salon
-- services from lib/salon.ts, so the storefront looks identical after the
-- switch to Supabase. Variant options (sizes/colors) come from
-- getVariantOptions() in lib/cart.ts.
--
-- Run after 0001_init.sql:
--   supabase db reset          (local; applies migrations then this file)
--   psql "$DATABASE_URL" -f supabase/seed.sql   (remote)
--
-- Safe to re-run: every insert is idempotent on the primary key.
-- ============================================================================

-- ── Products ────────────────────────────────────────────────────────────────

insert into products (id, name, description, price, original_price, category, images, sizes, colors, stock, rating, review_count, badge) values
  ('chanel-no5-mini',
   'Chanel No.5 Mini',
   'The icon, travel-sized. A floral-aldehyde classic that lasts all day on campus.',
   2500, null, 'Perfumes',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuAy8kl7sj6JdUBHPI0F3ytpMSyFHEfIL9ezXsjnlf20d5-DCeOaOJmn0JJapvsKA3dp8ddtbbRh2he9r91WEHiaU7N3cUjtEWlY-dEyzmLg8bg3qknte3NxDzPqHYL3dSE9WmQM5VnSA6Z0a3DaDQ0aIpEoj-wtFu8PzZebkULyT6SYOuxM17AhZI41yxFrc9WHrj0KMa8Qg_6wsNEL6LlBNSe8oz8crvpcJsUz9BEM_fCyiTUBtWMJ'],
   array['30ml','50ml','100ml'], array[]::text[], 24, 4.8, 124, 'New'),

  ('lv-speedy-bag',
   'LV Speedy Bag',
   'Structured top-handle bag with room for a laptop, notebook, and everything else.',
   8500, 9800, 'Bags',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuCVWalppuGMjKswUbfn0gKwdvM6wzNBWcP47HWqUNmJiz7YxZH0dbcOXpksDrTRIrY1pzj5du3TMTobGthcdBPNIk9GJPTepo95s-qqwNVuyMmxRtreJrXlCR8MrlKVd44jG7saJGBpNKMefr_8yxgnrkPe1ak7cJPraUVryoY8xQH0ZRB7NQW00wA0Gzt0tviTdc_f8ZbzHBQ1CzqrQsALURf660Tusr9l3b0MV6k5ujgGfVL2Nn6j'],
   array[]::text[], array['Black','Brown','Cream'], 8, 4.9, 56, 'Hot'),

  ('gel-manicure-kit',
   'Gel Manicure Kit',
   'Everything for an at-home gel set — base, color, top coat, and cuticle tools.',
   1200, null, 'Nails',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuDJu5zdQkwzbDi5vESHyMGriik8Z0fW33h13tdGMdfYq_jChZb6DU6NQkb2mvO02ZaD6_WNtNO9aHj9jCOh-dNT2Btq6NSSTqjpukwYPj-mn0ILREdV09_RcHRf3oNGvQ-a4q7vkKZ_WJDyaNaN12bvjGLgpEB6F1IgDXn2FV1-09FzwBuCsrb6z2T4Onacw7ymLd3Fl6-pkdrtRHWWlldx9DKEnQIw_es8iv6KQd6vBOaDFgszcSSY'],
   array[]::text[], array['Nude','Bold','Classic'], 30, 4.5, 15, null),

  ('dior-sauvage',
   'Dior Sauvage 100ml',
   'Fresh, peppery, and hard to miss. The go-to for evenings out.',
   4800, 5500, 'Perfumes',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuAdRyLQb2S_yuMJ59w5MyYSxLNBH8sbWVYkGfpdzxEV7hfB2f36365XFtJZF4YyN8MACrE9ahUb1tCZuj_JAljiWDFmnBShFO01-Up_T2_gB0EkllsyjMI8iobp8W6x2qR8DgAx564yiul2wNUnUUjvKd6Fj2KX3wlDfv3Qy3Gz3BQn2aSdMdW311tqwSaoAU2L1fSZBO9aENtMo7Mly5jXC8Qdwg-7reAjGnQv9OqvgaxMWt2M0eKJ'],
   array['30ml','50ml','100ml'], array[]::text[], 15, 5.0, 89, 'Sale'),

  ('crossbody-mini-bag',
   'Crossbody Mini Bag',
   'Lightweight everyday crossbody that fits your phone, cards, and lip gloss.',
   3200, null, 'Bags',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuBMXUILIEmeN2vV2l8fp8_34rPu0T0rKxow98dTsqBSwPQOoGciIjjgU6jsrQebMpLbqOvBWvsytNqM1DQo3GGmGv9Oki6wnR_af2jtsBQcvGxiOKDCyu9bS_ejnm-l9VKoXlWkKmq9QDvvNtnueSimnq-V-tYzklV_EKKncqLM_hhTp0xdpUp0Shb7pLdZcoiGj_e51e7WyX3R0diDGEA33cIiF6UrRhnFCjFKjl10I0smMQtESlIA'],
   array[]::text[], array['Black','Brown','Cream'], 12, 4.0, 42, 'Hot'),

  ('gold-hoop-earrings',
   'Gold Hoop Earrings',
   'Tarnish-resistant hoops that go with literally everything.',
   850, 1100, 'Fashion',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuDaoBqKyrShvsU0LpmYQbIN1L_RvJXl36PLr8QsBRVEoALjG3OJfsUpx4ASQjMC2n_TgtyC1k_7_fpDQXN_z4rOGaNTzbg0KhdvSF9NRlFiaShD3KXgNOUYXJNo5Zgp2Nu7ag_35EwhNoAwBY_tWB1wWT-Zz9grNiScztqFmakQq9LjYoutwZpN2GO3l1Tz8bwifgxvVxf1ZorPaj3qZ3Haz6iLcyFAY6fsQYXXbWSeqTFKMHun9lQH'],
   array['S','M','L'], array[]::text[], 40, 4.8, 210, 'Sale'),

  ('gel-polish-set',
   'Gel Polish Set',
   'Six campus-ready shades with a glossy, chip-resistant finish.',
   1200, null, 'Nails',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuDZ2wByUuPKXGJcMlqBE3OI1bvOps6JnL_h7fMWQeBUnxLlrFCha17-boQvw_6qETmK72SD3Ihse9c9wL_5uiuwwSWg7x12BYrZcqH7QhOUtR3udyVFYNSBuTr-EyQDeUxL7zJO6S7u_mmcOD5XAQMJnizK1JabLJTrjNYmgrvQX4yOXHcVL9ifz8aSSghP8sLYkaScHQVHRrv2UXPTaPkJXJkQBV6hHVjxl3oOzo48OoFcQn2g4ICd'],
   array[]::text[], array['Nude','Bold','Classic'], 25, 4.0, 15, null),

  ('silk-scarf',
   'Silk Scarf',
   'Wear it in your hair, on your bag, or at your neck. Three looks, one scarf.',
   1800, null, 'Fashion',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuAo59KXigRDLkS4eNERCgiCQtsQI2IqYnmzXqQtsLNKcPhpc1gO_4Im4Czek3LciVZ8Zf9JOzOVrWIsdRJaQUGZOVxdK97Tx4LMU5CoHRUfVPNjipfC3tlRE9ZrFxwZFHjbmg7s9iMw15y-hiU8sWZu7yeDXGbYrIhDhP6OSW-8rq_EcVQ6V6synulhAKCtkkDam9KJ4n9DXBOkxNM-q-gTKjlcTcnlp9bVgHd9yLa1pl-cI7vW-_tu'],
   array['S','M','L'], array[]::text[], 18, 5.0, 68, null)
on conflict (id) do nothing;

-- ── Salon services ──────────────────────────────────────────────────────────

insert into salon_services (id, name, description, price, duration, icon, image) values
  ('gel-manicure', 'Gel manicure',
   'Long-wear gel polish, shape, and cuticle care — a glow-up that lasts.',
   1500, '45 min', 'brush',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDJu5zdQkwzbDi5vESHyMGriik8Z0fW33h13tdGMdfYq_jChZb6DU6NQkb2mvO02ZaD6_WNtNO9aHj9jCOh-dNT2Btq6NSSTqjpukwYPj-mn0ILREdV09_RcHRf3oNGvQ-a4q7vkKZ_WJDyaNaN12bvjGLgpEB6F1IgDXn2FV1-09FzwBuCsrb6z2T4Onacw7ymLd3Fl6-pkdrtRHWWlldx9DKEnQIw_es8iv6KQd6vBOaDFgszcSSY'),

  ('gel-pedicure', 'Gel pedicure',
   'Foot soak, scrub, and gel color for soft, polished feet.',
   2000, '60 min', 'spa',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDZ2wByUuPKXGJcMlqBE3OI1bvOps6JnL_h7fMWQeBUnxLlrFCha17-boQvw_6qETmK72SD3Ihse9c9wL_5uiuwwSWg7x12BYrZcqH7QhOUtR3udyVFYNSBuTr-EyQDeUxL7zJO6S7u_mmcOD5XAQMJnizK1JabLJTrjNYmgrvQX4yOXHcVL9ifz8aSSghP8sLYkaScHQVHRrv2UXPTaPkJXJkQBV6hHVjxl3oOzo48OoFcQn2g4ICd'),

  ('nail-art', 'Nail art add-on',
   'Simple designs, chrome, or accents on top of your gel set.',
   500, '15 min', 'auto_awesome',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDaoBqKyrShvsU0LpmYQbIN1L_RvJXl36PLr8QsBRVEoALjG3OJfsUpx4ASQjMC2n_TgtyC1k_7_fpDQXN_z4rOGaNTzbg0KhdvSF9NRlFiaShD3KXgNOUYXJNo5Zgp2Nu7ag_35EwhNoAwBY_tWB1wWT-Zz9grNiScztqFmakQq9LjYoutwZpN2GO3l1Tz8bwifgxvVxf1ZorPaj3qZ3Haz6iLcyFAY6fsQYXXbWSeqTFKMHun9lQH'),

  ('fill-in', 'Gel fill-in',
   'Maintain your set with a clean fill and fresh top coat.',
   1200, '40 min', 'replay',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDJu5zdQkwzbDi5vESHyMGriik8Z0fW33h13tdGMdfYq_jChZb6DU6NQkb2mvO02ZaD6_WNtNO9aHj9jCOh-dNT2Btq6NSSTqjpukwYPj-mn0ILREdV09_RcHRf3oNGvQ-a4q7vkKZ_WJDyaNaN12bvjGLgpEB6F1IgDXn2FV1-09FzwBuCsrb6z2T4Onacw7ymLd3Fl6-pkdrtRHWWlldx9DKEnQIw_es8iv6KQd6vBOaDFgszcSSY'),

  ('lash-lift', 'Lash lift & tint',
   'Lifted lashes with a soft tint — wake-up-ready glam.',
   2500, '50 min', 'visibility',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuAo59KXigRDLkS4eNERCgiCQtsQI2IqYnmzXqQtsLNKcPhpc1gO_4Im4Czek3LciVZ8Zf9JOzOVrWIsdRJaQUGZOVxdK97Tx4LMU5CoHRUfVPNjipfC3tlRE9ZrFxwZFHjbmg7s9iMw15y-hiU8sWZu7yeDXGbYrIhDhP6OSW-8rq_EcVQ6V6synulhAKCtkkDam9KJ4n9DXBOkxNM-q-gTKjlcTcnlp9bVgHd9yLa1pl-cI7vW-_tu'),

  ('brow-shape', 'Brow shape & tint',
   'Clean arch, tint, and groom for a polished everyday look.',
   1000, '25 min', 'face',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuBMXUILIEmeN2vV2l8fp8_34rPu0T0rKxow98dTsqBSwPQOoGciIjjgU6jsrQebMpLbqOvBWvsytNqM1DQo3GGmGv9Oki6wnR_af2jtsBQcvGxiOKDCyu9bS_ejnm-l9VKoXlWkKmq9QDvvNtnueSimnq-V-tYzklV_EKKncqLM_hhTp0xdpUp0Shb7pLdZcoiGj_e51e7WyX3R0diDGEA33cIiF6UrRhnFCjFKjl10I0smMQtESlIA'),

  ('glam-makeup', 'Glam makeup',
   'Full face for events, shoots, or nights that need main-character energy.',
   3500, '60 min', 'brush',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuAy8kl7sj6JdUBHPI0F3ytpMSyFHEfIL9ezXsjnlf20d5-DCeOaOJmn0JJapvsKA3dp8ddtbbRh2he9r91WEHiaU7N3cUjtEWlY-dEyzmLg8bg3qknte3NxDzPqHYL3dSE9WmQM5VnSA6Z0a3DaDQ0aIpEoj-wtFu8PzZebkULyT6SYOuxM17AhZI41yxFrc9WHrj0KMa8Qg_6wsNEL6LlBNSe8oz8crvpcJsUz9BEM_fCyiTUBtWMJ'),

  ('soft-glam', 'Soft glam makeup',
   'Natural glow makeup for dates, day plans, and soft moments.',
   2500, '45 min', 'favorite',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCVWalppuGMjKswUbfn0gKwdvM6wzNBWcP47HWqUNmJiz7YxZH0dbcOXpksDrTRIrY1pzj5du3TMTobGthcdBPNIk9GJPTepo95s-qqwNVuyMmxRtreJrXlCR8MrlKVd44jG7saJGBpNKMefr_8yxgnrkPe1ak7cJPraUVryoY8xQH0ZRB7NQW00wA0Gzt0tviTdc_f8ZbzHBQ1CzqrQsALURf660Tusr9l3b0MV6k5ujgGfVL2Nn6j')
on conflict (id) do nothing;

-- ── First admin ─────────────────────────────────────────────────────────────
-- profiles.role is deliberately NOT client-writable (see the RLS policies in
-- 0001_init.sql), and is_admin() needs an existing admin — so the first one has
-- to be promoted here, with the service role.
--
-- The account must have signed in once so that auth.users (and therefore
-- profiles) has a row. Then edit the email below and run this file.

update profiles
set role = 'admin'
where email in (
  'info@globalsolutionsug.com'
  -- add more admins here, comma-separated
);
