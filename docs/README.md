# Kelmon — Documentation

Technical documentation for the Kelmon campus fashion, beauty and salon
platform. For setup instructions, start with the
[project README](../README.md); this folder covers the *why* and the detail.

**Status:** current as of 2026-09-27, after the EzyBite backend merge.

---

## Contents

### `architecture/`
System shape and the reasoning behind it.

| Document | Covers |
|---|---|
| [overview.md](architecture/overview.md) | Components, request flow, directory layout |
| [decisions/](architecture/decisions/) | Architecture Decision Records (ADRs) |

### `database/`
| Document | Covers |
|---|---|
| [schema.md](database/schema.md) | Every table, column and relationship |
| [row-level-security.md](database/row-level-security.md) | RLS policies and the reasoning per table |
| [migrations.md](database/migrations.md) | Applying and writing migrations |

### `api/`
| Document | Covers |
|---|---|
| [reference.md](api/reference.md) | Route handlers, request/response shapes, status codes |
| [server-actions.md](api/server-actions.md) | Admin mutations and their authorisation |

### `integrations/`
| Document | Covers |
|---|---|
| [mpesa.md](integrations/mpesa.md) | STK Push, callbacks, Paybill vs till, testing |
| [google-oauth.md](integrations/google-oauth.md) | Google sign-in setup |

### `operations/`
| Document | Covers |
|---|---|
| [environment.md](operations/environment.md) | Every environment variable |
| [local-development.md](operations/local-development.md) | Running locally, test login, sample data |
| [deployment.md](operations/deployment.md) | Production checklist |

### `security/`
| Document | Covers |
|---|---|
| [security-model.md](security/security-model.md) | Trust boundaries, authorisation layers |
| [known-issues.md](security/known-issues.md) | Open risks and accepted trade-offs |

### `guides/`
| Document | Covers |
|---|---|
| [admin-panel.md](guides/admin-panel.md) | Using each admin screen |
| [managing-products.md](guides/managing-products.md) | Catalogue, variants, images |

---

## Conventions used in these docs

- **Paths** are repo-relative (`lib/supabase/server.ts`).
- **Money** is Kenyan Shillings (KES), stored as `numeric(10,2)`, always whole
  shillings when sent to M-Pesa.
- **Timestamps** are `timestamptz`, stored UTC, rendered in `en-KE`.
- Where a decision has a non-obvious reason, the reason is stated inline rather
  than left implicit. If you disagree with one, the ADR is the place to change.

## Project history

This repository previously held two separate projects in one folder: **Kelmon**
(a Next.js storefront) and **EzyBite** (a vanilla HTML + Firebase food-delivery
app). EzyBite's storefront was removed; its admin panel and backend were ported
to Next.js and Supabase. The mapping from old to new is in the
[project README](../README.md#provenance), and the pre-merge state is preserved
in the first Git commit.
