# M-Pesa (Safaricom Daraja)

Implementation: [`lib/mpesa.ts`](../../lib/mpesa.ts),
[`app/api/mpesa/stk-push/route.ts`](../../app/api/mpesa/stk-push/route.ts),
[`app/api/mpesa/callback/route.ts`](../../app/api/mpesa/callback/route.ts).

This code is a merge of two implementations that both existed in this repo:
Kelmon's TypeScript structure, plus the production hardening from EzyBite's
`api/stkpush.js`, which ran live against Safaricom.

## Payment flow

```
Customer                 Kelmon                      Safaricom
   │                       │                             │
   │ checkout ───────────► │                             │
   │                  POST /api/orders                    │
   │                  (re-price, insert order)            │
   │ ◄── orderId ───────── │                             │
   │                       │                             │
   │ ─────────────────────►│ POST /api/mpesa/stk-push     │
   │                       │  amount from orders.total    │
   │                       │ ── OAuth token ────────────► │
   │                       │ ── STK push ───────────────► │
   │                       │ ◄── CheckoutRequestID ────── │
   │                       │  store id, status=awaiting   │
   │ ◄── "check phone" ─── │                             │
   │                       │                             │
   │ ◄═══════════ PIN prompt on handset ════════════════  │
   │ ── enters PIN ════════════════════════════════════►  │
   │                       │                             │
   │                       │ ◄── POST /api/mpesa/callback │
   │                       │  paid + award points         │
   │                       │ ── 200 ResultCode:0 ───────► │
```

## Paybill vs till

Set `MPESA_TILL_NUMBER` only when collecting on a till (Buy Goods). Leave it
blank for Paybill.

| | Paybill | Till (Buy Goods) |
|---|---|---|
| `TransactionType` | `CustomerPayBillOnline` | `CustomerBuyGoodsOnline` |
| `BusinessShortCode` | `MPESA_SHORTCODE` | `MPESA_SHORTCODE` (HO/store code) |
| `PartyB` | `MPESA_SHORTCODE` | `MPESA_TILL_NUMBER` |

The password is always derived from `MPESA_SHORTCODE`, never the till. Getting
this wrong yields an opaque Safaricom error, so it is worth re-reading: on a
till, `BusinessShortCode` and `PartyB` are **different values**.

EzyBite ran on a till; Kelmon's original code assumed Paybill. Both are now
supported from one code path.

## Timestamps are UTC, deliberately

```ts
function timestamp(): string {
  const d = new Date();
  // getUTC*, not getMonth()/getHours()
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + /* … */;
}
```

The password is `base64(shortcode + passkey + timestamp)`, so the timestamp and
the password must be derived from the same instant. Using local getters made the
value depend on the host's timezone: a developer machine in EAT and a Vercel box
in UTC produced different passwords for the same moment. UTC is deterministic
everywhere. Carried over from `api/stkpush.js`, which noted this after hitting it
in production.

## Phone normalisation

`normalizeKenyanPhone()` accepts `07…`, `01…`, `+254…`, `254…`, and bare 9-digit
`7…`/`1…`, and returns `2547XXXXXXXX` or `2541XXXXXXXX`.

Both Safaricom (`2547`) and Airtel (`2541`) prefixes are accepted; Kelmon's
original code allowed only `7`. Anything else returns `null` and the route
answers 400 rather than letting Safaricom reject it later with a vaguer error.

## Amounts

M-Pesa accepts whole shillings only, and never zero:

```ts
const amount = Math.max(1, Math.round(Number(params.amount)));
```

The amount is read from `orders.total`, never from the request body.

## The callback contract

**Always answer HTTP 200 with `ResultCode: 0`, even on internal failure.**

Safaricom treats anything else as a delivery failure and retries. A 500 from a
transient database error becomes a retry storm, and since the handler also awards
loyalty points, repeated delivery must be safe.

Two properties make that safe:

1. `mpesa_checkout_request_id` has a **unique partial index**, so the lookup
   cannot match two orders.
2. `award_loyalty_points()` takes `FOR UPDATE` on the order row and checks
   `points_awarded`, so a duplicate callback awards nothing.

On failure the order is set to `payment_status='failed'` but `status='pending'`,
leaving it retryable rather than dead.

## Local testing

Safaricom must reach the callback over public HTTPS. `localhost` will not do.

```bash
npx ngrok http 3000
# then in .env.local:
MPESA_CALLBACK_URL=https://<id>.ngrok-free.app/api/mpesa/callback
```

Restart the dev server after changing it. The ngrok URL changes each restart on
the free tier.

### Sandbox

```
MPESA_ENV=sandbox
MPESA_SHORTCODE=174379
```

Sandbox credentials come from the Daraja portal and differ from production ones.
Using a production key with `MPESA_ENV=sandbox` (or vice versa) produces an HTTP
404 on the token request; the route surfaces a `hint` saying exactly that.

### Without credentials

`/api/mpesa/stk-push` returns 503 with the list of missing variables:

```json
{ "error": "M-Pesa is not configured.", "missing": ["MPESA_CONSUMER_KEY", "MPESA_PASSKEY"] }
```

Checkout with `payment: "cod"` works without any M-Pesa setup.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| 502, Safaricom HTTP 404 | Wrong consumer key/secret, or key from the other environment |
| `Invalid Access Token` | Same as above |
| Wrong shortcode / merchant errors | On a till, `PartyB` must be the till and `TransactionType` must be `CustomerBuyGoodsOnline` |
| Prompt arrives, order never updates | Callback unreachable — check `MPESA_CALLBACK_URL` is public HTTPS and the tunnel is alive |
| Callback arrives, order not found | `mpesa_checkout_request_id` was not stored; check the STK route's service-role write succeeded |
| Order paid but no points | `award_loyalty_points` needs `user_id` — admin-direct orders have none, so they earn nothing by design |
| Repeated callbacks | The handler returned non-200; it must always ACK |

Both routes log with a `[stk-push]` / `[mpesa-callback]` prefix, including the
`CheckoutRequestID` and `ResultCode`.

## Security notes

- Callbacks are **not authenticated**. Safaricom does not sign them, so anyone
  who learns a `CheckoutRequestID` could POST a forged success. The ids are
  unguessable and never exposed to the client, which is mitigation, not a fix.
  See [security/known-issues.md](../security/known-issues.md).
- The callback uses the service-role key, which bypasses RLS. It is one of only
  two places that does.
