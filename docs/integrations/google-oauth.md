# Google Sign-In

Google OAuth is handled by Supabase Auth. **No environment variables are needed
in this app** — the client ID and secret live in the Supabase dashboard.

See [ADR-0001](../architecture/decisions/0001-supabase-auth-over-firebase.md) for
why Supabase Auth rather than Firebase.

## Setup

### 1. Google Cloud Console

**APIs & Services → Credentials → Create Credentials → OAuth client ID**

- Application type: **Web application**
- Authorised redirect URI — this is Supabase's callback, **not** your app's:

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

This is the step most often got wrong: people enter their own
`/auth/callback` here. The browser goes Google → Supabase → your app, so Google
must be told about Supabase's URL.

Copy the client ID and secret.

### 2. Supabase dashboard

**Authentication → Providers → Google** — enable, paste the client ID and secret.

### 3. Redirect allow-list

**Authentication → URL Configuration → Redirect URLs** — add *your app's*
callback for each environment:

```
http://localhost:3000/auth/callback
https://<your-domain>/auth/callback
```

Supabase refuses to redirect to an unlisted URL. A missing entry here shows as a
successful Google sign-in that lands back on `/signin` with an error.

Also set **Site URL** to your production origin.

## How it works in the app

1. `signInWithGoogle()` in
   [`AuthProvider.tsx`](../../components/providers/AuthProvider.tsx) calls
   `signInWithOAuth({ provider: "google" })` with
   `redirectTo: ${origin}/auth/callback?next=<path>`.
2. Google authenticates and returns to Supabase, which redirects to
   `/auth/callback` with a one-time `code`.
3. [`app/auth/callback/route.ts`](../../app/auth/callback/route.ts) exchanges the
   code for a session and sets cookies.
4. The `handle_new_user` trigger has already created the `profiles` row, pulling
   `full_name` and `avatar_url` from the OAuth metadata.
5. The user is redirected to `next`.

`prompt: "select_account"` is set so returning users can switch Google accounts
instead of being signed straight back into the last one.

### The `next` parameter is constrained

```ts
const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/profile";
```

Without this, `?next=https://evil.example` would redirect a freshly
authenticated user off-site. The `//` check matters too — `//evil.example` is a
protocol-relative URL that browsers treat as absolute.

## Avatars

Google avatar URLs are on `*.googleusercontent.com`, which is allow-listed in
[`next.config.ts`](../../next.config.ts) so `next/image` will serve them. A new
image host must be added there or images silently fail to render.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `redirect_uri_mismatch` from Google | Google's authorised URI must be `https://<ref>.supabase.co/auth/v1/callback` |
| Returns to `/signin` with an error | Your `/auth/callback` is not in Supabase's Redirect URLs |
| Signs in but no name or avatar | `handle_new_user` reads `full_name`/`name` and `avatar_url` from `raw_user_meta_data`; check what the provider actually returned |
| Works locally, fails in production | Production origin missing from Redirect URLs, or Site URL still set to localhost |
| Google button not shown | The app hides it when Supabase is unconfigured — expected in local testing mode |

## Email/password

Enabled alongside Google. `signUpWithEmail` passes `full_name` in the signup
metadata so the trigger can populate the profile. Whether a confirmation email
is required is a Supabase setting (**Authentication → Providers → Email**); the
sign-in UI tells the user to check their inbox on signup.
