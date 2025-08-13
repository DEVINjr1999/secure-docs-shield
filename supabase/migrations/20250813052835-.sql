-- Document key shares: allow clients to securely share a document decryption key with the assigned reviewer
-- Create table
CREATE TABLE IF NOT EXISTS public.document_key_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  shared_by uuid NOT NULL,
  key_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Enable RLS
ALTER TABLE public.document_key_shares ENABLE ROW LEVEL SECURITY;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_document_key_shares_document_id ON public.document_key_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_key_shares_expires_at ON public.document_key_shares(expires_at);

-- Policy: Owners can view their own document key shares
CREATE POLICY IF NOT EXISTS "Owners can view their key shares"
ON public.document_key_shares
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_key_shares.document_id
      AND d.user_id = auth.uid()
  )
);

-- Policy: Owners can insert key shares for their documents
CREATE POLICY IF NOT EXISTS "Owners can insert key shares"
ON public.document_key_shares
FOR INSERT
WITH CHECK (
  shared_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_key_shares.document_id
      AND d.user_id = auth.uid()
  )
);

-- Policy: Owners can delete their key shares
CREATE POLICY IF NOT EXISTS "Owners can delete their key shares"
ON public.document_key_shares
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_key_shares.document_id
      AND d.user_id = auth.uid()
  )
);

-- Policy: Assigned reviewer can read key shares (if not expired)
CREATE POLICY IF NOT EXISTS "Assigned reviewer can view key shares"
ON public.document_key_shares
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_key_shares.document_id
      AND d.assigned_reviewer_id = auth.uid()
  )
  AND (expires_at IS NULL OR expires_at > now())
);

-- Policy: Admins can view all key shares
CREATE POLICY IF NOT EXISTS "Admins can view all key shares"
ON public.document_key_shares
FOR SELECT
USING (is_admin());