-- Fix the foreign key constraint issue by updating the documents table to reference profiles instead of auth.users
-- This is the correct approach for Supabase as we cannot directly reference auth.users

-- Drop the existing foreign key constraint
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_user_id_fkey;

-- Add the correct foreign key constraint that references profiles table
ALTER TABLE public.documents 
ADD CONSTRAINT documents_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;