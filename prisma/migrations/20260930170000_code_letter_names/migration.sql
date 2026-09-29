-- ============================================================================
-- Code letters get a name
--
-- A letter is now three things: a name (e.g. Bags), the letter (B) and the
-- category its products come from. Existing letters are named after their
-- category. Like the letter and category, the name is locked once added.
-- ============================================================================

ALTER TABLE "code_prefixes" ADD COLUMN "name" TEXT;

ALTER TABLE "code_prefixes" DISABLE TRIGGER code_prefixes_guard;
UPDATE "code_prefixes" SET "name" = "category" WHERE "name" IS NULL;
ALTER TABLE "code_prefixes" ENABLE TRIGGER code_prefixes_guard;

ALTER TABLE "code_prefixes" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "code_prefixes" ADD CONSTRAINT "code_prefixes_name_valid"
  CHECK (length(trim("name")) BETWEEN 1 AND 60);

CREATE OR REPLACE FUNCTION public.guard_code_prefixes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF tg_op = 'DELETE' THEN
    RAISE EXCEPTION 'Code letters are permanent: letter % can''t be removed.', old.letter;
  END IF;

  IF tg_op = 'INSERT' THEN
    -- A new letter always starts from zero.
    new.last_number := 0;
    new.letter := upper(trim(new.letter));
    new.category := trim(new.category);
    new.name := trim(new.name);
    RETURN new;
  END IF;

  IF new.letter IS DISTINCT FROM old.letter
     OR new.name IS DISTINCT FROM old.name
     OR lower(trim(new.category)) IS DISTINCT FROM lower(trim(old.category)) THEN
    RAISE EXCEPTION 'Letter % is locked.', old.letter;
  END IF;

  -- Only the database's own triggers (nested, depth > 1) move the counter.
  IF new.last_number IS DISTINCT FROM old.last_number AND pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION 'The code counter can''t be changed by hand; it moves when products are added.';
  END IF;
  IF new.last_number < old.last_number AND public.code_letter_in_use(old.letter) THEN
    RAISE EXCEPTION 'The code counter can''t go backwards while products still use letter %.', old.letter;
  END IF;
  RETURN new;
END;
$$;
