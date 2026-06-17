
-- Enable RLS on masked_audit_logs view
ALTER VIEW public.masked_audit_logs SET (security_invoker = on);

-- Since masked_audit_logs is a VIEW, we need to ensure the underlying audit_logs table RLS applies.
-- Views with security_invoker=on will use the calling user's permissions.
-- The underlying audit_logs already has RLS restricting SELECT to admins only.
