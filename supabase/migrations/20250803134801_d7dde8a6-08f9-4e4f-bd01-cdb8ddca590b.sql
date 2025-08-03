-- Fix the auto_assign_reviewer function GROUP BY issue
CREATE OR REPLACE FUNCTION public.auto_assign_reviewer(p_document_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    reviewer_id UUID;
    assignment_count INTEGER;
BEGIN
    -- Find the legal reviewer with the least assignments
    SELECT p.user_id INTO reviewer_id
    FROM public.profiles p
    LEFT JOIN public.document_assignments da ON p.user_id = da.reviewer_id AND da.is_active = true
    WHERE p.role = 'legal_reviewer' 
    AND p.account_status = 'active'
    AND p.deleted_at IS NULL
    GROUP BY p.user_id
    ORDER BY COUNT(da.id) ASC, MIN(p.created_at) ASC
    LIMIT 1;
    
    -- If we found a reviewer, assign the document
    IF reviewer_id IS NOT NULL THEN
        -- Update the document
        UPDATE public.documents 
        SET assigned_reviewer_id = reviewer_id,
            status = 'under_review'
        WHERE id = p_document_id;
        
        -- Create assignment record
        INSERT INTO public.document_assignments (
            document_id, 
            reviewer_id, 
            assigned_by
        ) VALUES (
            p_document_id,
            reviewer_id,
            auth.uid()
        );
        
        -- Log the assignment
        PERFORM public.log_audit_event(
            auth.uid(),
            'document_assigned',
            'document',
            null,
            null,
            null,
            p_document_id,
            null,
            jsonb_build_object('assigned_reviewer_id', reviewer_id),
            null,
            true,
            null,
            jsonb_build_object('document_id', p_document_id, 'reviewer_id', reviewer_id)
        );
    END IF;
    
    RETURN reviewer_id;
END;
$function$