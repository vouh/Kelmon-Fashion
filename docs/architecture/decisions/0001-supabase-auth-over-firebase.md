# ADR-0001 — Supabase Auth over Firebase Auth

- **Status:** Accepted
- **Date:** 2026-09-27

## Context

The pre-merge EzyBite app used Firebase Auth (email/password plus Google) with
Firestore. Kelmon was moving to Supabase Postgres for the database. The question
was whether to keep Firebase Auth alongside Supabase, or move auth to Supabase
too.

The stated requirement was Google sign-in that is free. Both providers satisfy
that: Google OAuth costs nothing on either free tier. So cost did not decide it.

## Options considered

### A. Firebase Auth + Supabase Postgres

Keep the existing Firebase Auth project and point the app's database at
Supabase.

Supabase Row Level Security authorises a request by reading claims from the JWT
that Supabase Auth issued — `auth.uid()` in a policy resolves from that token.
A Firebase ID token is not that token. To make RLS work you would have to:

1. Verify the Firebase ID token server-side.
2. Mint a second JWT signed with the Supabase JWT secret, carrying a `sub` that
   matches a row in `profiles`.
3. Attach that token to every Supabase request.
4. Keep the two user directories in step — a deletion or email change in
   Firebase has to propagate, or RLS starts authorising against a stale identity.

Every policy then depends on that bridge being correct. A bug in step 2 is an
authorisation bug across every table at once.

### B. Supabase Auth + Supabase Postgres

One vendor issues the token and enforces the policies. `auth.uid()` works
directly. `auth.users` is the single user directory, and a trigger
(`handle_new_user`) creates the matching `profiles` row on signup.

Cost: the existing Firebase user records do not carry over. Passwords are
hashed and cannot be migrated, so existing EzyBite users would have to reset.

## Decision

**Option B.** Supabase Auth, with Google OAuth and email/password.

The deciding factor is that authorisation rules belong in the schema. With
Option B, "a customer reads only their own orders" is a policy in
`0001_init.sql` that holds no matter which code path runs — a Server Component,
a Server Action, or a raw query from the browser client. With Option A the same
guarantee depends on application glue that has to be right everywhere.

The user-migration cost is near zero in practice: Kelmon is a different product
with a different catalogue, and the EzyBite accounts were food-delivery
customers who are not Kelmon's users.

## Consequences

**Good**

- `auth.uid()` works natively; no token bridging, no custom JWT signing.
- One user directory. No two-way sync to keep correct.
- Authorisation is reviewable in one SQL file rather than spread across routes.
- `profiles.role` drives admin access, replacing EzyBite's hardcoded
  `ADMIN_EMAILS` array in client-side JavaScript.

**Bad / accepted**

- Existing Firebase accounts do not transfer; passwords cannot be migrated.
- Vendor concentration: auth and data share one provider, so a Supabase outage
  takes down both. Accepted — splitting them would not improve availability
  much, since the database is required to serve anything useful anyway.
- Google OAuth requires dashboard configuration that is not captured in code.
  Mitigated by documenting it in
  [integrations/google-oauth.md](../../integrations/google-oauth.md).

**Bootstrapping consequence**

`profiles.role` is deliberately not client-writable — the RLS update policy
re-reads the stored row, so a user cannot promote themselves. That means the
first admin cannot be created through the app and must be granted with the
service role. See [operations/environment.md](../../operations/environment.md).
