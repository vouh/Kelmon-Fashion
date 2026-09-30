-- Email ownership verification for password-based public sign-ups.
-- Codes are sent through Resend and stored only as SHA-256 hashes.
CREATE TABLE "signup_email_codes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "signup_email_codes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "signup_email_codes_attempts_non_negative" CHECK ("attempts" >= 0)
);

CREATE INDEX "signup_email_codes_email_created_idx"
  ON "signup_email_codes" ("email", "created_at" DESC);

-- Server/service-role only. No browser policy is intentionally defined.
ALTER TABLE "signup_email_codes" ENABLE ROW LEVEL SECURITY;
