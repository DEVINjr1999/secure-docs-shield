-- Create document_signatures table for e-signature functionality
CREATE TABLE public.document_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL,
  signature_data TEXT NOT NULL,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('draw', 'type')),
  signature_method TEXT NOT NULL CHECK (signature_method IN ('drawn', 'typed')),
  signature_text TEXT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

-- Create policies for document signatures
CREATE POLICY "Users can view signatures on their documents" 
ON public.document_signatures 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_signatures.document_id 
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Assigned reviewers can view signatures" 
ON public.document_signatures 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_signatures.document_id 
    AND documents.assigned_reviewer_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all signatures" 
ON public.document_signatures 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Users can sign their own documents" 
ON public.document_signatures 
FOR INSERT 
WITH CHECK (
  auth.uid() = signer_id AND
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_signatures.document_id 
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Assigned reviewers can sign documents" 
ON public.document_signatures 
FOR INSERT 
WITH CHECK (
  auth.uid() = signer_id AND
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_signatures.document_id 
    AND documents.assigned_reviewer_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_document_signatures_document_id ON public.document_signatures(document_id);
CREATE INDEX idx_document_signatures_signer_id ON public.document_signatures(signer_id);