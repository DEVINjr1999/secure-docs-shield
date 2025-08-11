
-- Ensure pgcrypto is available (safe to run repeatedly)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fix verify_security_answers to hash using bytea input
CREATE OR REPLACE FUNCTION public.verify_security_answers(p_user_id uuid, p_answers jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  q RECORD;
  provided jsonb;
  normalized text;
  computed_hash text;
  correct_count int := 0;
BEGIN
  -- Require at least two active questions
  IF (SELECT count(*) FROM public.security_questions WHERE user_id = p_user_id AND is_active) < 2 THEN
    RETURN FALSE;
  END IF;

  FOR q IN
    SELECT id, salt, answer_hash
    FROM public.security_questions
    WHERE user_id = p_user_id AND is_active
  LOOP
    provided := (
      SELECT elem
      FROM jsonb_array_elements(p_answers) AS elem
      WHERE (elem->>'id')::uuid = q.id
      LIMIT 1
    );

    IF provided IS NULL THEN
      RETURN FALSE;
    END IF;

    -- Normalize like the client: trim + lower
    normalized := lower(btrim(provided->>'answer'));

    -- Hash using pgcrypto with bytea input
    computed_hash := encode(
      digest(
        convert_to(normalized || q.salt, 'UTF8'),
        'sha256'
      ),
      'hex'
    );

    IF computed_hash = q.answer_hash THEN
      correct_count := correct_count + 1;
    END IF;
  END LOOP;

  -- Both answers must match
  RETURN correct_count >= 2;
END;
$function$;

-- Fix generate_secure_encryption_key to use bytea for digest inputs
CREATE OR REPLACE FUNCTION public.generate_secure_encryption_key(p_document_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_id uuid;
    key_material text;
    key_hash text;
BEGIN
    user_id := auth.uid();

    IF user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Authentication required'
        );
    END IF;

    -- Combine multiple entropy sources and hash correctly with bytea
    key_material := encode(
        digest(
          -- Concatenate bytea: text parts converted to bytea + random bytes
          convert_to(user_id::text || p_document_id::text || extract(epoch from now())::text, 'UTF8')
          || gen_random_bytes(32),
          'sha256'
        ),
        'hex'
    );

    -- Store a hash reference (no plaintext key)
    key_hash := encode(
      digest(convert_to(key_material, 'UTF8'), 'sha256'),
      'hex'
    );

    -- Log key generation (without storing the actual key)
    PERFORM log_audit_event(
        user_id,
        'encryption_key_generated',
        'security',
        null,
        null,
        null,
        p_document_id,
        null,
        jsonb_build_object('key_hash', key_hash),
        null,
        true,
        null,
        jsonb_build_object('document_id', p_document_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'key', key_material,
        'key_hash', key_hash
    );
END;
$function$;
