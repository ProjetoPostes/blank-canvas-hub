-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- Create a new restrictive INSERT policy that only allows admins and operadores chefe to create notifications
CREATE POLICY "Only admins and chefes can create notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operador_chefe'::app_role)
);