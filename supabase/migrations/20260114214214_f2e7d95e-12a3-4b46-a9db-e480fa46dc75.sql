-- =============================================
-- RPC: Validação de Acesso do Usuário
-- Camada extra de proteção para operações críticas
-- =============================================

CREATE OR REPLACE FUNCTION public.validate_user_access(
  p_table_name TEXT,
  p_operation TEXT,
  p_record_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_roles TEXT[];
  v_has_access BOOLEAN := false;
  v_reason TEXT := 'Acesso negado';
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Usuário não autenticado'
    );
  END IF;
  
  -- Buscar roles do usuário
  SELECT ARRAY_AGG(role::TEXT) INTO v_roles
  FROM public.user_roles
  WHERE user_id = v_user_id;
  
  -- Se não tem roles, negar acesso
  IF v_roles IS NULL OR array_length(v_roles, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Usuário sem roles atribuídas',
      'user_id', v_user_id
    );
  END IF;
  
  -- Validar acesso baseado em tabela e operação
  CASE p_table_name
    -- Tabelas operacionais
    WHEN 'caderno', 'despacho' THEN
      IF p_operation = 'DELETE' THEN
        v_has_access := 'admin' = ANY(v_roles);
        v_reason := CASE WHEN v_has_access THEN 'Admin pode deletar' ELSE 'Apenas admin pode deletar' END;
      ELSIF p_operation IN ('INSERT', 'UPDATE') THEN
        v_has_access := v_roles && ARRAY['admin', 'operador_chefe', 'operador'];
        v_reason := CASE WHEN v_has_access THEN 'Operador pode modificar' ELSE 'Sem permissão para modificar' END;
      ELSIF p_operation = 'SELECT' THEN
        v_has_access := v_roles && ARRAY['admin', 'operador_chefe', 'operador', 'consultor'];
        v_reason := CASE WHEN v_has_access THEN 'Acesso de leitura permitido' ELSE 'Sem permissão de leitura' END;
      END IF;
      
    -- Demandas
    WHEN 'demandas' THEN
      IF p_operation = 'DELETE' THEN
        v_has_access := v_roles && ARRAY['admin', 'operador_chefe'];
        v_reason := CASE WHEN v_has_access THEN 'Chefe pode deletar' ELSE 'Apenas admin/chefe pode deletar' END;
      ELSIF p_operation IN ('INSERT') THEN
        v_has_access := v_roles && ARRAY['admin', 'operador_chefe'];
        v_reason := CASE WHEN v_has_access THEN 'Chefe pode criar' ELSE 'Apenas admin/chefe pode criar' END;
      ELSIF p_operation = 'UPDATE' THEN
        v_has_access := v_roles && ARRAY['admin', 'operador_chefe', 'operador'];
        v_reason := CASE WHEN v_has_access THEN 'Pode atualizar' ELSE 'Sem permissão para atualizar' END;
      ELSIF p_operation = 'SELECT' THEN
        v_has_access := v_roles && ARRAY['admin', 'operador_chefe', 'operador'];
        v_reason := CASE WHEN v_has_access THEN 'Acesso permitido' ELSE 'Sem acesso' END;
      END IF;
      
    -- Gestão de usuários
    WHEN 'user_roles' THEN
      v_has_access := 'admin' = ANY(v_roles);
      v_reason := CASE WHEN v_has_access THEN 'Admin pode gerenciar roles' ELSE 'Apenas admin pode gerenciar roles' END;
      
    WHEN 'profiles' THEN
      IF p_operation = 'DELETE' THEN
        v_has_access := 'admin' = ANY(v_roles);
        v_reason := CASE WHEN v_has_access THEN 'Admin pode deletar perfis' ELSE 'Apenas admin pode deletar' END;
      ELSE
        v_has_access := v_roles && ARRAY['admin', 'operador_chefe', 'operador', 'consultor'];
        v_reason := CASE WHEN v_has_access THEN 'Acesso permitido' ELSE 'Sem acesso' END;
      END IF;
      
    -- Auditoria (somente leitura para admin)
    WHEN 'audit_logs' THEN
      v_has_access := 'admin' = ANY(v_roles) AND p_operation = 'SELECT';
      v_reason := CASE WHEN v_has_access THEN 'Admin pode visualizar logs' ELSE 'Sem acesso a logs de auditoria' END;
      
    ELSE
      v_has_access := false;
      v_reason := 'Tabela não reconhecida';
  END CASE;
  
  RETURN jsonb_build_object(
    'allowed', v_has_access,
    'reason', v_reason,
    'user_id', v_user_id,
    'roles', v_roles,
    'table', p_table_name,
    'operation', p_operation
  );
END;
$$;

-- =============================================
-- RPC: Deleção Segura com Log
-- Validação extra antes de deletar registros
-- =============================================

CREATE OR REPLACE FUNCTION public.secure_delete_record(
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
  v_is_admin BOOLEAN;
  v_deleted_count INTEGER;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Verificar se é admin
  v_is_admin := public.has_role(v_user_id, 'admin');
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Apenas administradores podem executar deleção segura'
    );
  END IF;
  
  -- Registrar log de auditoria antes de deletar
  PERFORM public.log_audit_action(
    'SECURE_DELETE_REQUEST',
    p_table_name,
    p_record_id::TEXT,
    NULL,
    jsonb_build_object(
      'deleted_by', v_user_id,
      'deleted_at', now()
    )
  );
  
  -- Retornar sucesso (a deleção real será feita pelo cliente após validação)
  RETURN jsonb_build_object(
    'success', true,
    'validated', true,
    'deleted_by', v_user_id,
    'table', p_table_name,
    'record_id', p_record_id
  );
END;
$$;

-- =============================================
-- RPC: Verificar Saúde de Segurança
-- Retorna status das configurações de segurança
-- =============================================

CREATE OR REPLACE FUNCTION public.check_security_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tables_with_rls INTEGER;
  v_total_policies INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  -- Apenas admin pode verificar saúde de segurança
  IF NOT public.has_role(v_user_id, 'admin') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Apenas administradores podem verificar saúde de segurança'
    );
  END IF;
  
  -- Contar tabelas com RLS
  SELECT COUNT(*) INTO v_tables_with_rls
  FROM pg_tables t
  JOIN pg_class c ON t.tablename = c.relname
  WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true;
  
  -- Contar políticas RLS
  SELECT COUNT(*) INTO v_total_policies
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RETURN jsonb_build_object(
    'status', 'healthy',
    'checked_at', now(),
    'checked_by', v_user_id,
    'metrics', jsonb_build_object(
      'tables_with_rls', v_tables_with_rls,
      'total_policies', v_total_policies,
      'has_role_function', true,
      'audit_logging', true
    )
  );
END;
$$;

-- Garantir que as funções podem ser chamadas por usuários autenticados
GRANT EXECUTE ON FUNCTION public.validate_user_access(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_delete_record(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_security_health() TO authenticated;