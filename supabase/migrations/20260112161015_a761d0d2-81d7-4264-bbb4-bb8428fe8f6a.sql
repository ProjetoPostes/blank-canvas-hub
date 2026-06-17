-- Drop the existing permissive INSERT policy on audit_logs
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a restrictive INSERT policy that only allows service role or admin
-- Since audit_trigger_function and log_audit_action are SECURITY DEFINER,
-- they bypass RLS and can still insert. Regular users cannot insert directly.
CREATE POLICY "Only system functions can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- Allow service_role to insert (for edge functions or admin operations)
CREATE POLICY "Service role can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);