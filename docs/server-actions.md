# Server Actions

All admin mutations live in
[`app/admin/actions.ts`](../app/admin/actions.ts). They replace the write half
of EzyBite's `window.fb_*` layer.

## Why Server Actions rather than route handlers

Every admin write would otherwise need a hand-written endpoint, a fetch wrapper,
and its own auth check — nine screens' worth of surface to keep consistent.
Server Actions remove the transport layer: the function is called directly from
the client component and executes on the server.

## Authorisation

Every action begins the same way:

```ts
async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorized.");
  return createClient();
}
```

This is the **third** of three checks (`middleware.ts`, then the admin layout,
then this). It matters independently of the other two: a Server Action is a
callable POST endpoint, so it can be invoked directly without ever loading an
admin page. RLS would reject the write anyway; this produces a clear error
instead of a silent no-op.

## Return convention

Actions return a result object rather than throwing across the boundary:

```ts
export type ActionResult = { ok: true } | { ok: false; error: string };
```

Client components surface `error` inline. `createDirectOrder` additionally
returns `orderId` on success.

After a successful write, the affected paths are revalidated so the next render
shows fresh data:

```ts
revalidatePath("/admin/products");
revalidatePath("/shop");
revalidatePath(`/product/${input.id}`);
```

## Reference

### Orders

| Action | Signature |
|---|---|
| `updateOrderStatus` | `(orderId: string, status: OrderStatus)` |
| `updatePaymentStatus` | `(orderId: string, paymentStatus: PaymentStatus)` |
| `deleteOrder` | `(orderId: string)` — `order_items` cascade |
| `createDirectOrder` | `({ customerName, phone, dropPoint, total, notes? })` |

`createDirectOrder` is the road-sale path, ported from `fb_createDirectOrder`. It
sets `source='admin_direct'` and `user_id=null`, and opens the order unpaid so it
can then be charged via STK Push.

`updatePaymentStatus` lets an admin mark an order paid by hand — necessary for
cash on delivery, and as a manual fallback when a callback is lost. It does
**not** award loyalty points; only the M-Pesa callback does.

### Products

| Action | Signature |
|---|---|
| `upsertProduct` | `(input: ProductInput)` |
| `deleteProduct` | `(id: string)` |
| `setProductActive` | `(id: string, active: boolean)` |

`upsertProduct` validates before writing: non-empty slug and name, `price > 0`,
and `originalPrice >= price` when present. The database enforces the same
constraints, so this is for the error message, not the guarantee.

Prefer `setProductActive(id, false)` over `deleteProduct`. Deleting sets
`order_items.product_id` to null on historical orders; deactivating hides the
product from the storefront while keeping the catalogue intact.

### Content

| Action | Signature |
|---|---|
| `createDeal` | `({ title, description?, image?, code?, discountPercent?, endsAt? })` |
| `deleteDeal` | `(id: string)` |
| `createUpdate` | `({ title, body, tag? })` |
| `deleteUpdate` | `(id: string)` |
| `deleteReview` | `(id: string)` |
| `updateBookingStatus` | `(id: string, status: BookingStatus)` |

## Calling one

```tsx
const [pending, startTransition] = useTransition();
const router = useRouter();

function run(action: () => Promise<ActionResult>) {
  startTransition(async () => {
    const result = await action();
    if (!result.ok) setError(result.error);
    else router.refresh();
  });
}

run(() => updateOrderStatus(order.id, "packed"));
```

`useTransition` gives a pending flag for disabling controls while the action is
in flight. `router.refresh()` re-runs the Server Component to pick up the
revalidated data.

## Known gap

Actions are not rate-limited. An authenticated admin could issue writes in a
loop. Given that the actor is already trusted with full data access, this is
accepted rather than mitigated — see
[security/known-issues.md](known-issues.md).
