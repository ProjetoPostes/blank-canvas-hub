-- Update RLS policies for caderno to allow consultor to view (SELECT only)
DROP POLICY IF EXISTS "Operators can view caderno" ON public.caderno;

CREATE POLICY "Operators and consultors can view caderno" 
ON public.caderno 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operador_chefe'::app_role) OR 
  has_role(auth.uid(), 'operador'::app_role) OR
  has_role(auth.uid(), 'consultor'::app_role)
);

-- Update profiles RLS to allow consultors to view other profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operador_chefe'::app_role) OR 
  has_role(auth.uid(), 'operador'::app_role) OR
  has_role(auth.uid(), 'consultor'::app_role)
);