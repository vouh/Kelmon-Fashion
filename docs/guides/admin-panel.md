# Admin Panel Guide

For whoever runs Kelmon day to day. Access is at **`/admin`**, and requires an
account whose `profiles.role` is `admin`.

There is no separate admin login. Sign in at `/signin` like any customer; the
role decides what you can reach.

## Screens

| Screen | Path | For |
|---|---|---|
| Overview | `/admin` | Daily check-in: totals, recent orders |
| All Orders | `/admin/orders` | Fulfilment — the main working screen |
| Products | `/admin/products` | Catalogue, prices, stock, images |
| Statistics | `/admin/stats` | 7-day trends, payment outcomes |
| Manage Deals | `/admin/deals` | Promotions |
| Updates | `/admin/updates` | Customer-facing announcements |
| Reviews | `/admin/reviews` | Ratings, moderation |
| Successful Payments | `/admin/transactions` | Paid orders with receipts |
| Failed Payments | `/admin/transactions/failed` | Failures with reasons |

## Understanding order state

Every order carries **two** independent statuses. This trips people up, so it is
worth reading once.

**Status** is fulfilment — where the goods are:

`pending` → `awaiting_mpesa` → `confirmed` → `packed` → `delivered`, or
`cancelled`.

**Payment** is money — whether you have been paid:

`unpaid` → `initiated` → `paid`, or `failed`.

They move separately, and that is deliberate. A cash-on-delivery order can be
`delivered` + `unpaid` until you collect. An M-Pesa order is `confirmed` + `paid`
the moment the callback lands, before you have packed anything.

**Revenue counts `payment_status = 'paid'` only.** An order marked `delivered`
but still `unpaid` contributes nothing to the revenue figure — which is correct,
and the usual explanation for "why is revenue lower than my order count
suggests".

## Daily routine

1. **Overview** — check Pending. Those need action.
2. **All Orders**, filter **unpaid** — chase or cancel.
3. Work the paid ones: `confirmed` → `packed` → `delivered` as you go.
4. **Failed Payments** — look at the reason column. "Insufficient balance" and
   "Request cancelled by user" are customer-side; anything mentioning the
   shortcode or token is a configuration problem, not a customer problem.

## All Orders

**Search** matches order id, customer name, or phone.

**Filters:** all / pending / unpaid / paid / delivered.

**Changing status** — use the dropdowns in the row. Changes save immediately;
there is no separate save button.

**Line items** — the chevron expands the order to show what was bought,
including the size or colour chosen, and any customer note.

**Deleting** is two-step: click the bin, then confirm. It is a **hard delete** —
the order and its line items are gone, and it disappears from revenue and
statistics. Cancel instead of deleting unless the order is genuine rubbish, so
your figures stay honest.

**Direct Order** creates an order for a walk-up or road sale. Fill in name,
phone, drop point and amount; it is created unpaid so you can then charge it with
an STK Push. These are tagged `direct` in the list.

## Marking a payment paid by hand

Use the Payment dropdown. Two cases where you need this:

- **Cash on delivery** — nothing automatic will ever mark it paid.
- **A lost callback** — the customer shows you an M-Pesa confirmation but the
  order is still `awaiting_mpesa`. Check **Failed Payments** first, and confirm
  the receipt number on the customer's SMS before overriding.

Note: a manual mark **does not award loyalty points.** Only a genuine M-Pesa
callback does. If a customer is owed points after a manual fix, that currently
needs a database change.

## Statistics

Two separate charts rather than one combined: orders per day and revenue per day
are different scales, and overlaying them on two axes makes both harder to read.

Each chart has a **Table** toggle for exact figures — hovering gives one value at
a time, the table gives all seven.

**Conversion** is paid orders ÷ all orders. A low figure usually means abandoned
M-Pesa prompts, so cross-check **Failed Payments**.

**Payment outcomes** uses colour *and* an icon and label, so the states are
distinguishable if you print the page or are colourblind.

## Reviews

You can delete but not edit — editing someone's review and leaving their name on
it would be dishonest.

The histogram shows the spread. Watch the **1–2 star** tile: a rise there usually
tracks a delivery problem rather than the products.

Deleting a review recalculates that product's rating automatically.

## Deals and Updates

**Deals** appear on the storefront. Title is required; promo code, discount
percent, image and end date are optional. An end date in the past means it stops
showing.

**Updates** are announcements — restocks, new features, notices. Pick a tag
(`news`, `feature`, `restock`, `event`, `notice`) so they group sensibly.

Both are create-and-delete only; there is no edit. Delete and re-create to
change one.

## Notes

- **Sign Out** is at the bottom of the sidebar.
- The panel is **dark-themed always**, independent of the storefront's
  light/dark setting.
- It works on a phone — the sidebar collapses behind the menu button. Usable for
  checking orders on the move; the products form is easier on a desktop.
- **View Site** opens the storefront.
- Admin pages are never cached, so what you see is current as of page load. Use
  the browser refresh to re-check.

## See also

- [managing-products.md](managing-products.md)
- [integrations/mpesa.md](../integrations/mpesa.md) — when payments misbehave
