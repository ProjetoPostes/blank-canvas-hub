-- Explicit deny-all policies on encryption_config (defense in depth)
CREATE POLICY "Deny all select on encryption_config"
ON public.encryption_config FOR SELECT
USING (false);

CREATE POLICY "Deny all insert on encryption_config"
ON public.encryption_config FOR INSERT
WITH CHECK (false);

CREATE POLICY "Deny all update on encryption_config"
ON public.encryption_config FOR UPDATE
USING (false);

CREATE POLICY "Deny all delete on encryption_config"
ON public.encryption_config FOR DELETE
USING (false);

-- Restrict user_roles writes to admins only (prevent privilege escalation)
CREATE POLICY "Only admins can insert user_roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update user_roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete user_roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));