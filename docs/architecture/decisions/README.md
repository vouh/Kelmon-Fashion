# Architecture Decision Records

Each ADR records one decision: the context, the options, what was chosen, and
what it costs. They are immutable once accepted — to change a decision, add a
new ADR that supersedes the old one and update the old one's status.

## Format

```markdown
# ADR-NNNN — Title

- **Status:** Proposed | Accepted | Superseded by ADR-NNNN
- **Date:** YYYY-MM-DD

## Context
## Options considered
## Decision
## Consequences
```

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-supabase-auth-over-firebase.md) | Supabase Auth over Firebase Auth | Accepted |
| [0002](0002-single-store-schema.md) | Single-store catalogue, not multi-vendor | Accepted |
| [0003](0003-admin-panel-in-nextjs.md) | Rewrite the admin panel in Next.js | Accepted |
| [0004](0004-server-side-repricing.md) | Re-price orders server-side | Accepted |
| [0005](0005-dev-auth-fallback.md) | Development-only auth fallback | Accepted |
