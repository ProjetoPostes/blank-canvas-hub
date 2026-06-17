-- =============================================
-- FASE 1: Corrigir RLS Policy do Despacho
-- =============================================

-- Remover política existente de SELECT
DROP POLICY IF EXISTS "Operators can view despacho" ON despacho;

-- Criar nova política incluindo consultor
CREATE POLICY "Operators and consultors can view despacho" 
  ON despacho FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'operador_chefe') OR 
    has_role(auth.uid(), 'operador') OR
    has_role(auth.uid(), 'consultor')
  );

-- =============================================
-- FASE 2: Implementar Soft Delete
-- =============================================

-- 2.1 Adicionar colunas deleted_at e deleted_by nas tabelas sensíveis
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;

ALTER TABLE caderno ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE caderno ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;

ALTER TABLE despacho ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE despacho ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;

-- 2.2 Criar índices para performance de queries com soft delete
CREATE INDEX IF NOT EXISTS idx_demandas_deleted_at ON demandas(deleted_at);
CREATE INDEX IF NOT EXISTS idx_caderno_deleted_at ON caderno(deleted_at);
CREATE INDEX IF NOT EXISTS idx_despacho_deleted_at ON despacho(deleted_at);

-- 2.3 Atualizar políticas RLS para filtrar registros soft-deleted

-- DEMANDAS: Atualizar política de SELECT
DROP POLICY IF EXISTS "Operators can view their own demandas" ON demandas;
CREATE POLICY "Operators can view their own demandas" 
  ON demandas FOR SELECT
  USING (
    deleted_at IS NULL AND (
      (operador_id = auth.uid()) OR 
      (criado_por = auth.uid()) OR 
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'operador_chefe')
    )
  );

-- CADERNO: Atualizar política de SELECT
DROP POLICY IF EXISTS "Operators and consultors can view caderno" ON caderno;
CREATE POLICY "Operators and consultors can view caderno" 
  ON caderno FOR SELECT
  USING (
    deleted_at IS NULL AND (
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'operador_chefe') OR 
      has_role(auth.uid(), 'operador') OR 
      has_role(auth.uid(), 'consultor')
    )
  );

-- DESPACHO: Atualizar política de SELECT (já recriada com consultor acima, refazer com soft delete)
DROP POLICY IF EXISTS "Operators and consultors can view despacho" ON despacho;
CREATE POLICY "Operators and consultors can view despacho" 
  ON despacho FOR SELECT
  USING (
    deleted_at IS NULL AND (
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'operador_chefe') OR 
      has_role(auth.uid(), 'operador') OR
      has_role(auth.uid(), 'consultor')
    )
  );

-- 2.4 Políticas para admins verem registros deletados (auditoria)
CREATE POLICY "Admins can view deleted demandas" 
  ON demandas FOR SELECT
  USING (
    deleted_at IS NOT NULL AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can view deleted caderno" 
  ON caderno FOR SELECT
  USING (
    deleted_at IS NOT NULL AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can view deleted despacho" 
  ON despacho FOR SELECT
  USING (
    deleted_at IS NOT NULL AND has_role(auth.uid(), 'admin')
  );

-- 2.5 Criar função RPC para soft delete
CREATE OR REPLACE FUNCTION soft_delete_record(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_has_permission BOOLEAN := false;
  v_result INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;
  
  -- Validar permissão de delete baseado na tabela
  CASE p_table_name
    WHEN 'demandas' THEN
      v_has_permission := has_role(v_user_id, 'admin') OR has_role(v_user_id, 'operador_chefe');
    WHEN 'caderno', 'despacho' THEN
      v_has_permission := has_role(v_user_id, 'admin');
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Tabela não suporta soft delete');
  END CASE;
  
  IF NOT v_has_permission THEN
    -- Log tentativa não autorizada
    PERFORM log_audit_action(
      'UNAUTHORIZED_DELETE_ATTEMPT',
      p_table_name,
      p_record_id::TEXT,
      NULL,
      jsonb_build_object('attempted_by', v_user_id, 'attempted_at', now())
    );
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para deletar');
  END IF;
  
  -- Executar soft delete baseado na tabela
  CASE p_table_name
    WHEN 'demandas' THEN
      UPDATE demandas SET deleted_at = NOW(), deleted_by = v_user_id 
      WHERE id = p_record_id AND deleted_at IS NULL;
      GET DIAGNOSTICS v_result = ROW_COUNT;
    WHEN 'caderno' THEN
      UPDATE caderno SET deleted_at = NOW(), deleted_by = v_user_id 
      WHERE id = p_record_id AND deleted_at IS NULL;
      GET DIAGNOSTICS v_result = ROW_COUNT;
    WHEN 'despacho' THEN
      UPDATE despacho SET deleted_at = NOW(), deleted_by = v_user_id 
      WHERE id = p_record_id AND deleted_at IS NULL;
      GET DIAGNOSTICS v_result = ROW_COUNT;
  END CASE;
  
  IF v_result = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registro não encontrado ou já deletado');
  END IF;
  
  -- Log da ação de soft delete
  PERFORM log_audit_action(
    'SOFT_DELETE',
    p_table_name,
    p_record_id::TEXT,
    NULL,
    jsonb_build_object('deleted_by', v_user_id, 'deleted_at', now())
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'deleted_by', v_user_id,
    'deleted_at', now(),
    'table', p_table_name,
    'record_id', p_record_id
  );
END;
$$;

-- =============================================
-- FASE 3: Mascaramento de Dados Sensíveis
-- =============================================

-- 3.1 Criar view mascarada para audit_logs
CREATE OR REPLACE VIEW masked_audit_logs WITH (security_invoker=on) AS
SELECT 
  id, 
  user_id, 
  action, 
  table_name, 
  record_id, 
  created_at,
  ip_address,
  user_agent,
  -- Mascarar dados sensíveis no old_data
  CASE 
    WHEN old_data IS NOT NULL THEN
      old_data 
        - 'numcpf' 
        - 'email' 
        - 'telefone' 
        - 'numtel' 
        - 'numtel2'
        - 'dth_nascimento'
        || CASE WHEN old_data ? 'numcpf' THEN jsonb_build_object('numcpf', '***.***.***-**') ELSE '{}'::jsonb END
        || CASE WHEN old_data ? 'email' THEN jsonb_build_object('email', '***@***') ELSE '{}'::jsonb END
        || CASE WHEN old_data ? 'telefone' THEN jsonb_build_object('telefone', '(**) *****-****') ELSE '{}'::jsonb END
        || CASE WHEN old_data ? 'numtel' THEN jsonb_build_object('numtel', '(**) *****-****') ELSE '{}'::jsonb END
        || CASE WHEN old_data ? 'numtel2' THEN jsonb_build_object('numtel2', '(**) *****-****') ELSE '{}'::jsonb END
        || CASE WHEN old_data ? 'dth_nascimento' THEN jsonb_build_object('dth_nascimento', '**/**/****') ELSE '{}'::jsonb END
    ELSE NULL
  END as old_data,
  -- Mascarar dados sensíveis no new_data
  CASE 
    WHEN new_data IS NOT NULL THEN
      new_data 
        - 'numcpf' 
        - 'email' 
        - 'telefone'
        - 'numtel'
        - 'numtel2'
        - 'dth_nascimento'
        || CASE WHEN new_data ? 'numcpf' THEN jsonb_build_object('numcpf', '***.***.***-**') ELSE '{}'::jsonb END
        || CASE WHEN new_data ? 'email' THEN jsonb_build_object('email', '***@***') ELSE '{}'::jsonb END
        || CASE WHEN new_data ? 'telefone' THEN jsonb_build_object('telefone', '(**) *****-****') ELSE '{}'::jsonb END
        || CASE WHEN new_data ? 'numtel' THEN jsonb_build_object('numtel', '(**) *****-****') ELSE '{}'::jsonb END
        || CASE WHEN new_data ? 'numtel2' THEN jsonb_build_object('numtel2', '(**) *****-****') ELSE '{}'::jsonb END
        || CASE WHEN new_data ? 'dth_nascimento' THEN jsonb_build_object('dth_nascimento', '**/**/****') ELSE '{}'::jsonb END
    ELSE NULL
  END as new_data
FROM audit_logs;

-- =============================================
-- FASE 4: Mitigação de IDOR
-- =============================================

-- 4.1 Criar função RPC para validar atribuição de operador
CREATE OR REPLACE FUNCTION validate_operador_assignment(p_operador_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_operador_exists BOOLEAN;
  v_operador_name TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Usuário não autenticado');
  END IF;
  
  -- Verificar se operador existe e tem role apropriada
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_operador_id 
    AND role IN ('admin', 'operador_chefe', 'operador')
  ) INTO v_operador_exists;
  
  IF NOT v_operador_exists THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Operador não encontrado ou sem permissão'
    );
  END IF;
  
  -- Buscar nome do operador
  SELECT full_name INTO v_operador_name
  FROM profiles
  WHERE user_id = p_operador_id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'operador_id', p_operador_id,
    'operador_name', COALESCE(v_operador_name, 'Nome não disponível')
  );
END;
$$;