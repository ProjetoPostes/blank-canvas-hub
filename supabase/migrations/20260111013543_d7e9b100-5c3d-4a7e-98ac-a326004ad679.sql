-- Add username column to profiles table for login-based authentication
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Allow admins to view all profiles (needed for admin page)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view own or admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update any profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update own or admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);