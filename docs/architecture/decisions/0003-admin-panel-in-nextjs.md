# ADR-0003 — Rewrite the admin panel in Next.js

- **Status:** Accepted
- **Date:** 2026-09-27

## Context

EzyBite's admin panel was nine static HTML files in `admin/`, sharing
`admin-shell.js` (sidebar injected as a template string), `admin-auth.js` (the
access gate) and `js/firebase-service.js` (all data access via `window.fb_*`
globals). It worked and was in production.

The database was moving to Supabase, so `js/firebase-service.js` had to be
rewritten regardless. The question was only whether the *pages* stayed static
HTML or became part of the Next.js app.

## Options considered

### A. Keep static HTML, swap the data layer

Move `admin/` to `public/admin/` and replace `firebase-service.js` with a
`supabase-service.js` exposing the same `window.fb_*` function names, so the
existing markup keeps working untouched.

Cheapest, and preserves the UI exactly. But:

- Files in `public/` are served as static assets, so no server-side gate is
  possible. The access check stays in browser JavaScript.
- The admin session and the storefront session are separate — two sign-ins.
- No shared TypeScript types with the storefront; the order shape is duplicated
  and can drift from the schema silently.

### B. Port the pages to `app/admin/*` React routes

More work, and the markup is rebuilt rather than reused.

## Decision

**Option B.**

The deciding factor is the access gate. `admin-auth.js` worked like this:

```js
// admin/admin-auth.js — the original
const ADMIN_EMAILS = ['peterkelvinkibiru1532@gmail.com', 'sabastianthuo3@gmail.com'];
// inject a full-screen overlay, wait for Firebase, compare email, then reveal
setTimeout(() => { if (gateStillPresent) deny(); }, 10000);
```

Three problems, all structural rather than fixable in place:

1. **The admin HTML is delivered to anyone who requests it.** The overlay hides
   it; it does not withhold it. View-source reveals the full panel.
2. **The admin list is a client-side constant**, so adding an admin is a code
   deploy, and the list of who has access is public.
3. **It fails open on a timeout path.** If Firebase is slow, the 10-second
   fallback fires `deny()` — but any bug that removed the overlay early would
   reveal the page, because nothing server-side was checking.

Under Option A these stay true no matter how good the new data layer is. Under
Option B the check runs in `middleware.ts` before any markup is generated, again
in `app/admin/layout.tsx`, and again inside every Server Action — and the admin
list becomes `profiles.role`, a database value.

## Consequences

**Good**

- Admin HTML never reaches a non-admin browser.
- Granting admin is a row update, not a deploy; the list is not public.
- One session for storefront and admin.
- Admin and storefront share `lib/supabase/types.ts`, so a schema change that
  breaks the admin panel fails at `tsc`, not at runtime.
- Mutations are Server Actions, so no hand-written endpoints to secure.

**Bad / accepted**

- The markup was rewritten, so the panel is a re-creation of the original rather
  than the original. Layout, spacing and the dark aesthetic were preserved;
  colours were rebranded from EzyBite orange to Kelmon purple deliberately.
- `window.confirm()` was replaced with a two-step inline confirm, which is a
  behaviour change. Native modal dialogs block the page and are awkward to
  automate.
- Chart.js (loaded from a CDN in `admin/stats.html`) was replaced with an
  inline-SVG `BarChart`, removing a third-party runtime dependency but also its
  features. Only bar charts are supported now.

## Notes

`admin/login.html` was not ported. Admins sign in at `/signin` like everyone
else and are routed by role, so there is no second credential surface to secure.
