-- Create document types enum
CREATE TYPE public.document_type AS ENUM (
  'contract',
  'agreement',
  'legal_notice',
  'compliance_document',
  'litigation_document',
  'corporate_document',
  'intellectual_property',
  'employment_document',
  'real_estate_document',
  'other'
);

-- Create document status enum
CREATE TYPE public.document_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'requires_revision'
);

-- Create jurisdiction enum
CREATE TYPE public.jurisdiction AS ENUM (
  'federal_australia',
  'nsw',
  'vic',
  'qld',
  'wa',
  'sa',
  'tas',
  'act',
  'nt',
  'international',
  'other'
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assigned_reviewer_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  document_type document_type NOT NULL,
  jurisdiction jurisdiction,
  status document_status NOT NULL DEFAULT 'draft',
  encrypted_content TEXT, -- For form data
  encryption_key_hash TEXT, -- Hashed encryption key for verification
  file_path TEXT, -- Path in storage for file uploads
  file_name TEXT,
  file_size INTEGER,
  file_mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  is_template BOOLEAN DEFAULT FALSE,
  template_data JSONB, -- For pre-built template configurations
  version INTEGER NOT NULL DEFAULT 1,
  parent_document_id UUID, -- For document versioning
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE
);

-- Create document comments table
CREATE TABLE public.document_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- Internal reviewer notes vs client-visible
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document assignments table
CREATE TABLE public.document_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create document templates table
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  document_type document_type NOT NULL,
  jurisdiction jurisdiction,
  template_schema JSONB NOT NULL, -- JSON schema for form fields
  default_content TEXT, -- Default template content
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.documents 
ADD CONSTRAINT fk_documents_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.documents 
ADD CONSTRAINT fk_documents_assigned_reviewer_id 
FOREIGN KEY (assigned_reviewer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.documents 
ADD CONSTRAINT fk_documents_parent_document_id 
FOREIGN KEY (parent_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;

ALTER TABLE public.document_comments 
ADD CONSTRAINT fk_document_comments_document_id 
FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

ALTER TABLE public.document_comments 
ADD CONSTRAINT fk_document_comments_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.document_assignments 
ADD CONSTRAINT fk_document_assignments_document_id 
FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

ALTER TABLE public.document_assignments 
ADD CONSTRAINT fk_document_assignments_reviewer_id 
FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.document_assignments 
ADD CONSTRAINT fk_document_assignments_assigned_by 
FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.document_templates 
ADD CONSTRAINT fk_document_templates_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on all tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents
CREATE POLICY "Users can view their own documents" 
ON public.documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Assigned reviewers can view documents" 
ON public.documents 
FOR SELECT 
USING (auth.uid() = assigned_reviewer_id);

CREATE POLICY "Admins can view all documents" 
ON public.documents 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Users can insert their own documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
ON public.documents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Assigned reviewers can update documents" 
ON public.documents 
FOR UPDATE 
USING (auth.uid() = assigned_reviewer_id);

CREATE POLICY "Admins can update all documents" 
ON public.documents 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Admins can delete documents" 
ON public.documents 
FOR DELETE 
USING (is_admin());

-- Create RLS policies for document comments
CREATE POLICY "Users can view comments on their documents" 
ON public.document_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE id = document_comments.document_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Assigned reviewers can view all comments" 
ON public.document_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE id = document_comments.document_id 
    AND assigned_reviewer_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all comments" 
ON public.document_comments 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Users can insert comments on their documents" 
ON public.document_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE id = document_comments.document_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Assigned reviewers can insert comments" 
ON public.document_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE id = document_comments.document_id 
    AND assigned_reviewer_id = auth.uid()
  )
);

CREATE POLICY "Admins can insert comments" 
ON public.document_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND is_admin());

-- Create RLS policies for document assignments
CREATE POLICY "Admins can view all assignments" 
ON public.document_assignments 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Legal reviewers can view their assignments" 
ON public.document_assignments 
FOR SELECT 
USING (auth.uid() = reviewer_id);

CREATE POLICY "Admins can insert assignments" 
ON public.document_assignments 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update assignments" 
ON public.document_assignments 
FOR UPDATE 
USING (is_admin());

-- Create RLS policies for document templates
CREATE POLICY "Everyone can view active templates" 
ON public.document_templates 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can view all templates" 
ON public.document_templates 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can insert templates" 
ON public.document_templates 
FOR INSERT 
WITH CHECK (is_admin() AND auth.uid() = created_by);

CREATE POLICY "Admins can update templates" 
ON public.document_templates 
FOR UPDATE 
USING (is_admin());

-- Create indexes for performance
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_assigned_reviewer_id ON public.documents(assigned_reviewer_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_document_type ON public.documents(document_type);
CREATE INDEX idx_documents_created_at ON public.documents(created_at);
CREATE INDEX idx_document_comments_document_id ON public.document_comments(document_id);
CREATE INDEX idx_document_assignments_reviewer_id ON public.document_assignments(reviewer_id);
CREATE INDEX idx_document_assignments_document_id ON public.document_assignments(document_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_comments_updated_at
BEFORE UPDATE ON public.document_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage policies for documents
CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Assigned reviewers can view documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE file_path = storage.objects.name 
    AND assigned_reviewer_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND is_admin());

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can update all documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents' AND is_admin());

-- Function to auto-assign reviewers (round-robin)
CREATE OR REPLACE FUNCTION public.auto_assign_reviewer(p_document_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    reviewer_id UUID;
    assignment_count INTEGER;
    min_assignments INTEGER;
BEGIN
    -- Find the legal reviewer with the least assignments
    SELECT p.user_id, COUNT(da.id) as assignments
    INTO reviewer_id, assignment_count
    FROM public.profiles p
    LEFT JOIN public.document_assignments da ON p.user_id = da.reviewer_id AND da.is_active = true
    WHERE p.role = 'legal_reviewer' 
    AND p.account_status = 'active'
    AND p.deleted_at IS NULL
    GROUP BY p.user_id
    ORDER BY assignments ASC, p.created_at ASC
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
$$;