# Kelmon — Documentation

Technical documentation for the Kelmon campus fashion, beauty and salon
platform. For what the product is and how to get it running, start with the
[project README](../README.md).

**Current as of:** 2026-09-27, after the EzyBite backend merge.

---

## Index

### Design

| Document | Covers |
|---|---|
| [architecture.md](architecture.md) | **The whole architecture design** — system shape, request flows, layer conventions, and all five design decisions with their reasoning |
| [data-model.md](data-model.md) | Every table, column, relationship, function and trigger |
| [row-level-security.md](row-level-security.md) | RLS policies table by table — the actual access control |

### Reference

| Document | Covers |
|---|---|
| [api-reference.md](api-reference.md) | Route handlers: request/response shapes and status codes |
| [server-actions.md](server-actions.md) | Admin mutations and their authorisation |
| [migrations.md](migrations.md) | Applying and writing migrations; the TypeScript mirror |

### Integrations

| Document | Covers |
|---|---|
| [mpesa.md](mpesa.md) | STK Push, callbacks, Paybill vs till, local testing, troubleshooting |
| [google-oauth.md](google-oauth.md) | Google sign-in setup |

### Operations

| Document | Covers |
|---|---|
| [environment.md](environment.md) | Every environment variable; the first-admin bootstrap |
| [local-development.md](local-development.md) | Running locally, test login, sample data, gotchas |
| [deployment.md](deployment.md) | Production checklist and smoke test |

### Security

| Document | Covers |
|---|---|
| [security-model.md](security-model.md) | Trust boundaries and the four authorisation layers |
| [known-issues.md](known-issues.md) | 11 open risks with severity and fixes |

### Operator guides

| Document | Covers |
|---|---|
| [admin-panel.md](admin-panel.md) | Using each admin screen; the two-status model |
| [managing-products.md](managing-products.md) | Catalogue, variants, images, stock |

### `formal/`

Empty, reserved for formal documentation.

---

## Where to start

| If you want to… | Read |
|---|---|
| Understand the system | [architecture.md](architecture.md) |
| Change the schema | [data-model.md](data-model.md) → [migrations.md](migrations.md) |
| Run it locally | [local-development.md](local-development.md) |
| Deploy it | [environment.md](environment.md) → [deployment.md](deployment.md) |
| Fix a payment problem | [mpesa.md](mpesa.md) |
| Run the shop day to day | [admin-panel.md](admin-panel.md) |
| Review security | [security-model.md](security-model.md) → [known-issues.md](known-issues.md) |

---

## Conventions

- **Paths** are repo-relative (`lib/supabase/server.ts`).
- **Money** is Kenyan Shillings (KES), stored as `numeric(10,2)`, always whole
  shillings when sent to M-Pesa.
- **Timestamps** are `timestamptz`, stored UTC, rendered in `en-KE`.
- Where a decision has a non-obvious reason, the reason is stated inline rather
  than left implicit.

## Project history

This repository previously held two projects in one folder: **Kelmon** (a Next.js
storefront) and **EzyBite** (a vanilla HTML + Firebase food-delivery app).
EzyBite's storefront was removed; its admin panel and backend were ported to
Next.js and Supabase. The old-to-new mapping is in the
[project README](../README.md#provenance), and the pre-merge state is preserved
in the first Git commit.
