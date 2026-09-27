# ADR-0002 — Single-store catalogue, not multi-vendor

- **Status:** Accepted
- **Date:** 2026-09-27

## Context

Kelmon is described as a campus fashion and e-commerce platform. "Platform" can
mean two very different products, and the difference determines the schema:

- a shop that Kelmon stocks and sells from, or
- a marketplace where students register as sellers and list their own items.

Getting this wrong is expensive in one direction: retrofitting per-vendor
ownership onto orders and payouts after launch touches the schema, every RLS
policy, the admin panel and the checkout flow.

## Options considered

### A. Single store

```
products(id, name, price, category, images[], sizes[], colors[], stock, active)
orders(id, user_id, status, payment_status, total, …)
order_items(order_id, product_id, quantity, variant, …)
profiles(id, full_name, campus, phone, role, loyalty_points)
```

Kelmon owns all inventory. RLS is simple: admins write products, everyone reads
active ones, customers read their own orders.

### B. Multi-vendor marketplace

Adds `vendors`, a `seller_id` on `products`, `vendor_id` on `order_items`, a
`payouts` table, per-vendor RLS, order splitting when a cart spans sellers, and
a vendor-facing dashboard alongside the admin one. Payments get harder too: one
STK Push collects into one till, so revenue has to be apportioned afterwards.

## Decision

**Option A**, single store.

It matches how the ported EzyBite admin already worked (one operator managing
all orders), and it is the smaller correct thing to build first.

## Consequences

**Good**

- RLS stays legible — no per-vendor row filtering.
- Checkout and M-Pesa stay simple: one order, one payment, one recipient.
- The admin panel ported from EzyBite fits without modification.

**Bad / accepted**

- No student sellers. If that becomes the product, it is a real migration, not a
  flag.

**Migration path if this is revisited**

The schema was designed so the move is additive rather than a rewrite:

1. Add `vendors`, and `vendor_id` to `products` and `order_items`
   (nullable at first).
2. Backfill every existing row to a single "Kelmon" vendor.
3. Make the columns `NOT NULL`.
4. Add per-vendor policies alongside the existing admin ones.

`order_items` already denormalises `name`, `price`, `image` and `category`, so an
order remains a faithful receipt even after a product changes hands or is
deleted — which is exactly what per-vendor accounting needs. That was chosen
with this path in mind.
