-- ============================================================================
-- One-time codes for sensitive deletions (payment records).
--
-- An admin asks to delete specific records; a 6-digit code is emailed to the
-- super admins, and only that code — once, within 10 minutes — carries out the
-- deletion. The records to delete are stored with the request, so a code can't
-- be reused on anything else. Only the server (service role) touches this.
-- ============================================================================

CREATE TABLE "sensitive_action_codes" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  -- 'delete_payments'
  "action"       TEXT NOT NULL,
  -- What will be deleted, e.g. {"orders": [...], "failures": [...]}
  "payload"      JSONB NOT NULL,
  -- Short human summary shown in the email and the audit trail.
  "summary"      TEXT NOT NULL,
  -- sha256 of the code; the code itself is never stored.
  "code_hash"    TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "requester_email" TEXT,
  "attempts"     INTEGER NOT NULL DEFAULT 0,
  "expires_at"   TIMESTAMPTZ(6) NOT NULL,
  "used_at"      TIMESTAMPTZ(6),
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "sensitive_action_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sensitive_action_codes_requester_idx"
  ON "sensitive_action_codes" ("requested_by", "created_at" DESC);

-- No policies: RLS on with none means only the service role can read or write.
ALTER TABLE "sensitive_action_codes" ENABLE ROW LEVEL SECURITY;
