# Managing Products

`/admin/products`. This screen has no EzyBite equivalent — the old menu was
hardcoded — so it was built for fashion inventory specifically: sizes, colours
and stock per item.

## Adding a product

**New product**, then:

| Field | Notes |
|---|---|
| **Name** | What customers see |
| **Slug** | The URL (`/product/silk-scarf`). Auto-filled from the name |
| **Category** | Free text with suggestions. A new value creates a new filter |
| **Badge** | `New`, `Hot`, `Sale`, or none |
| **Price** | KES, the amount charged |
| **Was** | Optional. Shows struck through next to the price |
| **Stock** | Units on hand |
| **Visible in shop** | Untick to hide without deleting |
| **Sizes** / **Colours** | Comma separated |
| **Description** | Shown on the product page |
| **Images** | First one is the card image |

### The slug is permanent

It auto-fills from the name, and you can edit it **only while creating**. Once
saved it is locked, because it is the product's URL and its foreign key in
`order_items`.

Use lowercase words with hyphens: `silk-scarf`, not `Silk Scarf 2024`.

Renaming a product later is fine — the name and slug are independent. A product
can be called "Silk Scarf (Limited)" while its URL stays `/product/silk-scarf`.

### Sizes and colours

Comma separated, and they become the customer's variant choice on the product
page:

```
Sizes:   S, M, L
Colours: Black, Brown, Cream
```

Whichever you fill in drives the picker. Most items want one or the other, not
both — perfumes use sizes (`30ml, 50ml, 100ml`), bags use colours, clothing uses
sizes.

The chosen variant is stored on the order line, so you know which one to pack.

### "Was" price

Only meaningful if it is **higher** than the price — the database rejects it
otherwise, since a "discount" to a higher number is not a discount. Pair it with
the `Sale` badge.

## Images

**Upload** accepts multiple files, up to 5 MB each, images only. They go to
Supabase Storage and are publicly readable.

The **first image is the card image** — the one on the shop grid and the
homepage. Reordering is not supported; to change which is first, remove the
others and re-upload in the order you want.

Hover an image and click the bin to remove it. That removes it from the product
immediately; the file stays in Storage.

### Practical advice

- Square or 4:5 portrait crops sit best in the card grid.
- Shoot against a plain background — the cards are small.
- Compress before uploading. A 4 MB photo displayed at 300px wastes your
  customers' mobile data, and campus connections are not always good.

## Editing

The pencil icon opens the product with its values loaded. Everything except the
slug is editable. Changes appear on the storefront immediately — the relevant
pages are revalidated on save.

## Hiding vs deleting

**Prefer hiding.** The eye icon (or unticking "Visible in shop") sets
`active = false`:

- gone from the shop, homepage, and search
- its direct URL still resolves for anyone holding the link
- past orders unaffected
- fully reversible

**Delete** is two-step and permanent. It also sets `product_id` to null on every
historical order line that referenced it. Those orders keep the product's name
and price — they were copied at purchase time, so receipts stay accurate — but
the link to the catalogue entry is gone.

Delete only genuine mistakes. For discontinued stock, hide it.

## Stock — read this

**Stock is displayed but never decremented.** Placing an order does not reduce
it. You are tracking inventory by hand.

That means the number customers see drifts from reality until you update it, and
nothing prevents overselling. It is item 5 in
[security/known-issues.md](../security/known-issues.md) and needs a code change
to fix properly.

Until then: update stock manually as you pack, or leave it high and treat it as
decorative rather than letting it mislead you.

Zero stock shows red in the admin list. It does **not** stop customers ordering.

## Categories

Free text. Typing a new value creates a new filter on the shop page; the live
list is derived from whatever active products exist.

Two consequences:

- A typo (`Bagss`) silently creates a new category with one item in it.
- Removing the last product in a category removes the filter.

Current set: Bags, Perfumes, Fashion, Nails.

## Seeding a catalogue

`supabase/seed.sql` loads eight sample products. Note that its images point at
Google-hosted URLs carried over from the original hardcoded catalogue — they are
not yours and will eventually stop working. Replace them with real photography
before launch.
