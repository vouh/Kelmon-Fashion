-- ============================================================================
-- Code letters: always locked, and numbering starts from 001
--
--  1. Letters are permanent: once added, a letter can't be removed, and its
--     letter and category can't be changed.
--  2. A letter with no products left starts again from 001. Counters used up
--     by test products (since deleted) are reset now, and whenever the last
--     product carrying a letter is deleted, that letter resets too.
--     While any product still carries the letter, its numbers only go up.
-- ============================================================================

-- Whether any product currently carries this letter's codes (P001, P002…).
CREATE OR REPLACE FUNCTION public.code_letter_in_use(p_letter text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM products WHERE code ~ ('^' || p_letter || '[0-9]+$'));
$$;

REVOKE EXECUTE ON FUNCTION public.code_letter_in_use(text) FROM PUBLIC, anon, authenticated;

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
    RETURN new;
  END IF;

  IF new.letter IS DISTINCT FROM old.letter
     OR lower(trim(new.category)) IS DISTINCT FROM lower(trim(old.category)) THEN
    RAISE EXCEPTION 'Letter % is locked to %.', old.letter, old.category;
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

-- When the last product carrying a letter is deleted, the letter starts over.
CREATE OR REPLACE FUNCTION public.reset_code_letter_when_empty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF old.code ~ '^[A-Z][0-9]+$' THEN
    UPDATE code_prefixes
    SET last_number = 0
    WHERE letter = left(old.code, 1)
      AND last_number > 0
      AND NOT public.code_letter_in_use(letter);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER products_reset_code_letter
  AFTER DELETE ON "products"
  FOR EACH ROW EXECUTE FUNCTION public.reset_code_letter_when_empty();

-- Counters used up by test products that have since been deleted.
ALTER TABLE "code_prefixes" DISABLE TRIGGER code_prefixes_guard;
UPDATE "code_prefixes" SET last_number = 0
WHERE last_number > 0 AND NOT public.code_letter_in_use(letter);
ALTER TABLE "code_prefixes" ENABLE TRIGGER code_prefixes_guard;
