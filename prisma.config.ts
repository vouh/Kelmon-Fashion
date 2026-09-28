import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration.
 *
 * Prisma 7 no longer accepts `url` / `directUrl` inside schema.prisma, and it no
 * longer auto-loads dotenv files — both are this file's job now.
 *
 * Two variables, because migrations and the app want different connections:
 *
 *   DIRECT_URL    port 5432, direct.     Migrations use this. They need a real
 *                                        session (advisory locks, DDL in a
 *                                        transaction) which pgbouncer's
 *                                        transaction pooling cannot provide.
 *   DATABASE_URL  port 6543, pooled.     Only relevant if something at runtime
 *                                        ever connects directly. Nothing does
 *                                        today — the app talks to Supabase over
 *                                        HTTP — so this is the fallback below.
 *
 * Both come from Supabase → Project Settings → Database → Connection string.
 */

// Prisma stopped loading dotenv files automatically in v7. Node's built-in
// loader covers it without adding a dependency; .env.local wins because that is
// where Next.js expects local secrets, and neither file is required to exist.
for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Absent or unreadable — the missing-URL error below is the clearer report.
  }
}

/**
 * Deliberately not `env("DIRECT_URL")`: that helper throws while the config is
 * being loaded, which breaks `prisma validate` and `prisma format` — commands
 * that never touch the database. Resolving to an empty string instead defers the
 * complaint to the commands that actually need a connection.
 */
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
