-- Remover política permissiva conflitante de audit_logs
-- A inserção de logs deve ser feita apenas via triggers SECURITY DEFINER
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;