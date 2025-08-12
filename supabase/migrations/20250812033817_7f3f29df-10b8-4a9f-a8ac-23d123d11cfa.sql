-- Ensure pgcrypto extension is present
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Make verify function resolve pgcrypto functions by adding extensions to search_path and fully-qualifying calls
CREATE OR REPLACE FUNCTION public.verify_security_answers(p_user_id uuid, p_answers jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $function$
DECLARE
  q RECORD;
  provided jsonb;
  normalized text;
  computed_hash text;
  correct_count int := 0;
BEGIN
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

    normalized := lower(btrim(provided->>'answer'));

    computed_hash := encode(
      extensions.digest(
        convert_to(normalized || q.salt, 'UTF8'),
        'sha256'::text
      ),
      'hex'
    );

    IF computed_hash = q.answer_hash THEN
      correct_count := correct_count + 1;
    END IF;
  END LOOP;

  RETURN correct_count >= 2;
END;
$function$;

-- Update generate_secure_encryption_key with correct search_path and qualified functions
CREATE OR REPLACE FUNCTION public.generate_secure_encryption_key(p_document_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
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

    key_material := encode(
        extensions.digest(
          convert_to(user_id::text || p_document_id::text || extract(epoch from now())::text, 'UTF8')
          || extensions.gen_random_bytes(32),
          'sha256'::text
        ),
        'hex'
    );

    key_hash := encode(
      extensions.digest(convert_to(key_material, 'UTF8'), 'sha256'::text),
      'hex'
    );

    RETURN jsonb_build_object(
        'success', true,
        'key', key_material,
        'key_hash', key_hash
    );
END;
$function$;