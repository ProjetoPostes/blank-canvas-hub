
-- 1. Revoke direct execution of internal/admin-only functions
REVOKE EXECUTE ON FUNCTION public.log_audit_action(text, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_sensitive(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_sensitive(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_encryption_key() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_trigger_function() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_caderno_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_despacho_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 2. Revoke anonymous execution of client-callable security-definer functions (authenticated keeps access)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_caderno_decrypted(boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_despacho_decrypted(boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_cliente_duplicatas(text, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_user_mfa_requirement(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_operadores() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_record(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.secure_delete_record(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_user_access(text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_operador_assignment(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_security_health() FROM PUBLIC, anon;

-- 3. Mask PII for consultor-only callers in caderno/despacho RPCs
CREATE OR REPLACE FUNCTION public.get_caderno_decrypted(p_show_deleted boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_is_operational BOOLEAN;
  v_is_consultor BOOLEAN;
BEGIN
  v_is_operational := has_role(auth.uid(), 'admin')
                   OR has_role(auth.uid(), 'operador_chefe')
                   OR has_role(auth.uid(), 'operador');
  v_is_consultor := has_role(auth.uid(), 'consultor');

  IF NOT (v_is_operational OR v_is_consultor) THEN
    RETURN '[]'::JSON;
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
    FROM (
      SELECT id, numos, numobra, status, nomelcd, regional, controle_os, origem, prazo,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(nomecli) ELSE '***' END as nomecli,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(numcpf) ELSE '***' END as numcpf,
        CASE WHEN v_is_operational THEN dth_nascimento ELSE NULL END as dth_nascimento,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(email) ELSE '***' END as email,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(numtel) ELSE '***' END as numtel,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(numtel2) ELSE '***' END as numtel2,
        complemento, dsclgr_os, motivo_improcedencia, pendencia_obra, criterio,
        tipo_carta_enviada, base_5311, tranche, responsavel, prioridade, observacao,
        empreiteira, bloco_cliente, data_carta, datasol, datacontab, data_766,
        dataprev, datatertrab, dth_envio_dineng, dth_retorno_dineng, dth_impedimento,
        data_recebimento, created_at, updated_at, deleted_at, deleted_by
      FROM caderno
      WHERE (p_show_deleted OR deleted_at IS NULL)
      ORDER BY created_at DESC
    ) t
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_despacho_decrypted(p_show_concluded boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_is_operational BOOLEAN;
  v_is_consultor BOOLEAN;
BEGIN
  v_is_operational := has_role(auth.uid(), 'admin')
                   OR has_role(auth.uid(), 'operador_chefe')
                   OR has_role(auth.uid(), 'operador');
  v_is_consultor := has_role(auth.uid(), 'consultor');

  IF NOT (v_is_operational OR v_is_consultor) THEN
    RETURN '[]'::JSON;
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
    FROM (
      SELECT id, numos, dias_para_despacho, inconsistencia, nomelcd, regional,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(nomecli) ELSE '***' END as nomecli,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(numcpf) ELSE '***' END as numcpf,
        CASE WHEN v_is_operational THEN dth_nascimento ELSE NULL END as dth_nascimento,
        responsavel, tratativa, motivo_da_improcedencia,
        base, familia,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(telefone) ELSE '***' END as telefone,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(email) ELSE '***' END as email,
        complemento, dsclgr_os, criterio, concluida, data_conclusao,
        created_at, updated_at, deleted_at, deleted_by
      FROM despacho
      WHERE deleted_at IS NULL
        AND (p_show_concluded OR tratativa != 'Concluída')
      ORDER BY created_at DESC
    ) t
  );
END;
$function$;

-- Re-apply revocation after CREATE OR REPLACE (which resets grants)
REVOKE EXECUTE ON FUNCTION public.get_caderno_decrypted(boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_despacho_decrypted(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_caderno_decrypted(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_despacho_decrypted(boolean) TO authenticated;
