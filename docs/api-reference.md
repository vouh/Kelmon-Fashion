# API Reference

Route handlers under `app/api/` and `app/auth/`. Admin mutations are Server
Actions, documented in [server-actions.md](server-actions.md).

All request and response bodies are JSON.

---

## `POST /api/orders`

Creates an order for the signed-in user.

**Auth:** required. Returns 401 otherwise.

### Request

```json
{
  "name": "Amina Wanjiru",
  "phone": "0712345678",
  "dropPoint": "UoN Main Campus — Gate C",
  "campus": "University of Nairobi",
  "payment": "mpesa",
  "notes": "Please call on arrival.",
  "lines": [
    { "productId": "lv-speedy-bag", "quantity": 1, "variant": "Black" }
  ]
}
```

`payment` is `"mpesa"` or `"cod"`. Anything else is treated as `mpesa`.

**Money is not accepted from the client.** Any `price`, `subtotal`,
`deliveryFee` or `total` in the payload is ignored. Each line is re-priced
against the `products` table and the delivery fee recomputed by
`deliveryFeeFor()`. See [ADR-0004](architecture.md#4-orders-re-priced-server-side).

`quantity` is floored with a minimum of 1. Only `productId`, `quantity` and
`variant` are honoured from each line.

### Response `200`

```json
{ "orderId": "KM-M2X9K1", "subtotal": 8500, "deliveryFee": 0, "total": 8500 }
```

### Errors

| Status | Condition |
|---|---|
| 400 | Missing `name`, `phone`, `dropPoint`, or empty `lines` |
| 401 | Not signed in |
| 409 | A product is missing or `active = false` — `"\"X\" is no longer available."` |
| 500 | Insert failed |
| 503 | Supabase not configured |

---

## `POST /api/mpesa/stk-push`

Sends an M-Pesa STK Push prompt for an existing order.

**Auth:** required. The order lookup is scoped by RLS to the caller's own
orders, so this doubles as the authorisation check — you cannot start a payment
against someone else's order.

### Request

```json
{ "orderId": "KM-M2X9K1", "phone": "0712345678" }
```

**There is no `amount` field.** The amount comes from `orders.total`. The
pre-merge version accepted a client-supplied amount, which let a caller be
prompted for any figure while the callback still marked the order fully paid.

### Response `200`

```json
{
  "success": true,
  "message": "Success. Request accepted for processing",
  "checkoutRequestId": "ws_CO_27092026143512345",
  "merchantRequestId": "29115-34620561-1"
}
```

On success the order is updated to `status='awaiting_mpesa'`,
`payment_status='initiated'`, with the checkout ids stored for the callback.

### Errors

| Status | Condition |
|---|---|
| 400 | Missing `orderId`/`phone`, or an unparseable Kenyan number |
| 404 | Order not found, or not visible to the caller |
| 409 | Order already paid |
| 502 | Safaricom rejected the request — body carries `details` and often `hint` |
| 503 | M-Pesa not configured — body lists the missing env vars |

A 502 includes a `hint` when the cause is diagnosable, e.g. HTTP 404 from
Safaricom means the access token was rejected, usually wrong
`MPESA_CONSUMER_KEY`/`SECRET` or a key from the wrong environment.

---

## `POST /api/mpesa/callback`

Called by Safaricom, not by the app. See
[integrations/mpesa.md](mpesa.md).

**Always returns HTTP 200 with `ResultCode: 0`** — including on internal errors.
Any other response makes Safaricom retry the callback repeatedly.

### Request (from Safaricom)

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_27092026143512345",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 8500 },
          { "Name": "MpesaReceiptNumber", "Value": "SJH4K2L9AA" },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}
```

### Behaviour

| `ResultCode` | Effect |
|---|---|
| `0` | `status='confirmed'`, `payment_status='paid'`, receipt stored, then `award_loyalty_points()` |
| non-zero | `status='pending'`, `payment_status='failed'`, `ResultDesc` stored — order stays retryable |

Lookup is by `mpesa_checkout_request_id`, which carries a unique partial index.
Uses the service-role client because no user session exists.

`GET` on this route also returns an ACK, since some Safaricom configurations
probe the URL.

### Response (always)

```json
{ "ResultCode": 0, "ResultDesc": "Success" }
```

---

## `GET /auth/callback`

OAuth landing route. Google redirects here with a one-time `code`, which is
exchanged for a session and stored in cookies.

| Query | Meaning |
|---|---|
| `code` | Authorisation code from the provider |
| `next` | Post-sign-in path. **Same-site only** — anything not starting with a single `/` falls back to `/profile`, so the parameter cannot bounce a freshly signed-in user to an external page |

Redirects to `/signin?error=…` on failure.

Register this URL in **Supabase → Authentication → URL Configuration**:
```
http://localhost:3000/auth/callback
https://<your-domain>/auth/callback
```

---

## `POST` / `DELETE /api/dev-auth`

**Development only.** Returns **404** when disabled, which is whenever
`NODE_ENV === "production"` or Supabase is configured. See
[ADR-0005](architecture.md#5-development-only-auth-fallback).

`POST { "email": "admin@gmail.com", "name": "Test Admin" }` sets an `httpOnly`
session cookie. The role is derived from the email server-side and never read
from the cookie. `DELETE` clears it.
