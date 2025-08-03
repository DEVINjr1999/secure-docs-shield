-- Add foreign key constraint to link documents.assigned_reviewer_id to profiles.user_id
ALTER TABLE public.documents 
ADD CONSTRAINT fk_assigned_reviewer 
FOREIGN KEY (assigned_reviewer_id) 
REFERENCES public.profiles(user_id);