# Migrations

```
supabase/
  migrations/
    0001_init.sql     schema, functions, triggers, RLS, storage bucket
  seed.sql            sample catalogue + first admin grant
```

## Applying

### Supabase dashboard
Paste the contents of `0001_init.sql` into **SQL Editor** and run. Then run
`seed.sql`.

### Supabase CLI
```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

### Local stack
```bash
npx supabase start
npx supabase db reset   # applies migrations, then seed.sql
```

`db reset` **drops and recreates** the database. Never point it at production.

## Writing a new migration

Name files `NNNN_short_description.sql`, sequentially. Migrations are
append-only — never edit an applied file, because environments that already ran
it will not re-run it and will silently diverge.

Checklist:

- [ ] `alter table … enable row level security` on every new table. Without it,
      the anon key can read everything.
- [ ] Policies for each access pattern. No policy means no access, which is the
      safe default but breaks the feature — so be explicit.
- [ ] `create trigger … execute function touch_updated_at()` if the table has
      `updated_at`.
- [ ] Update [`lib/supabase/types.ts`](../../lib/supabase/types.ts) to match.
- [ ] `npm run typecheck` — the hand-written types are how schema drift gets
      caught.
- [ ] Update [schema.md](schema.md).

## The TypeScript mirror

`lib/supabase/types.ts` is hand-written and must be kept in step. Two traps,
both of which cause **every query on the table to infer as `never`** rather than
a clear error:

**1. Row types must be `type` aliases, not `interface`s.**

```ts
export type ProductRow = { id: string; /* … */ };   // correct
export interface ProductRow { id: string; }         // breaks inference
```

`postgrest-js` constrains rows to `Record<string, unknown>`. TypeScript gives
object *type aliases* an implicit index signature but does not give one to
interfaces, so an interface is not assignable.

**2. `Relationships` must declare foreign keys used by embedded selects.**

`select("*, order_items(*)")` needs the relationship present in the type, or the
embed resolves to a `SelectQueryError`:

```ts
type OrderItemsRelationships = [
  {
    foreignKeyName: "order_items_order_id_fkey";
    columns: ["order_id"];
    isOneToOne: false;
    referencedRelation: "orders";
    referencedColumns: ["id"];
  },
];
```

An empty `Relationships: []` is fine for tables with no embeds.

### Generating instead
```bash
npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
```
This avoids both traps. The file is hand-written here only so the repo
typechecks without network access to a live project.

## Version compatibility

`@supabase/ssr` must match the installed `@supabase/supabase-js`. Version 0.5.x
imports `GenericSchema` from a deep path
(`@supabase/supabase-js/dist/module/lib/types`) that no longer exists in
supabase-js 2.117+. The symptom is identical to trap 1 above — every query types
as `never`, with no error pointing at the version mismatch.

If that happens, check the deep path exists before debugging your own types:

```bash
test -e node_modules/@supabase/supabase-js/dist/module/lib/types.d.ts \
  && echo present || echo "missing — upgrade @supabase/ssr"
```
