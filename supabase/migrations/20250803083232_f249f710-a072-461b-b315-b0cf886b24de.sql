-- Drop the problematic policy and recreate it correctly
DROP POLICY IF EXISTS "Everyone can view active templates" ON public.document_templates;

-- Create a simple policy that allows everyone to view active templates
CREATE POLICY "Public can view active templates" ON public.document_templates
FOR SELECT 
USING (is_active = true);