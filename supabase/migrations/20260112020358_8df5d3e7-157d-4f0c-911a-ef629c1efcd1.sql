-- =====================================================
-- AUDIT LOG TABLE - Rastrear ações dos usuários
-- =====================================================

-- Criar tabela de audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs de auditoria
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Sistema pode inserir logs (via trigger/function)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Ninguém pode atualizar ou deletar logs de auditoria
-- (nenhuma policy para UPDATE ou DELETE = operações bloqueadas)

-- =====================================================
-- FUNÇÃO PARA REGISTRAR AUDITORIA
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id TEXT DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_log_id UUID;
BEGIN
  -- Obter o usuário atual
  v_user_id := auth.uid();
  
  -- Inserir log de auditoria
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (v_user_id, p_action, p_table_name, p_record_id, p_old_data, p_new_data)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- =====================================================
-- TRIGGERS DE AUDITORIA PARA TABELAS PRINCIPAIS
-- =====================================================

-- Função genérica para trigger de auditoria
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_old_data JSONB;
  v_new_data JSONB;
  v_action TEXT;
  v_record_id TEXT;
BEGIN
  v_user_id := auth.uid();
  
  -- Determinar ação
  IF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_record_id := OLD.id::TEXT;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_record_id := NEW.id::TEXT;
  ELSIF (TG_OP = 'INSERT') THEN
    v_action := 'INSERT';
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_record_id := NEW.id::TEXT;
  END IF;
  
  -- Inserir log (só se tiver usuário autenticado)
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_user_id, v_action, TG_TABLE_NAME, v_record_id, v_old_data, v_new_data);
  END IF;
  
  -- Retornar a linha apropriada
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Triggers para caderno
CREATE TRIGGER audit_caderno_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.caderno
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Triggers para despacho
CREATE TRIGGER audit_despacho_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.despacho
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Triggers para demandas
CREATE TRIGGER audit_demandas_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Triggers para profiles
CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Triggers para user_roles
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- =====================================================
-- MELHORAR RLS DO CADERNO - Restringir por role
-- =====================================================

-- Remover política antiga que permite todos verem tudo
DROP POLICY IF EXISTS "Authenticated users can view caderno" ON public.caderno;

-- Nova política: apenas operadores podem ver caderno
CREATE POLICY "Operators can view caderno"
ON public.caderno
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operador_chefe'::app_role) OR 
  has_role(auth.uid(), 'operador'::app_role)
);

-- =====================================================
-- MELHORAR RLS DO DESPACHO - Restringir por role
-- =====================================================

-- Remover política antiga que permite todos verem tudo
DROP POLICY IF EXISTS "Authenticated users can view despacho" ON public.despacho;

-- Nova política: apenas operadores podem ver despacho
CREATE POLICY "Operators can view despacho"
ON public.despacho
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operador_chefe'::app_role) OR 
  has_role(auth.uid(), 'operador'::app_role)
);

-- =====================================================
-- ADICIONAR POLÍTICA DELETE PARA PROFILES
-- =====================================================

-- Permitir que admins deletem profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));