
-- 1) Tabela base_5311
CREATE TABLE IF NOT EXISTS public.base_5311 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controle INTEGER,
  identificacao TEXT,
  alocacao TEXT,
  tranche TEXT,
  nome TEXT,
  cpf TEXT,
  cpf_corrigido TEXT,
  criterios TEXT,
  endereco TEXT,
  municipio TEXT,
  polo TEXT,
  regional TEXT,
  obra TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para lookup rápido por CPF (digits-only)
CREATE INDEX IF NOT EXISTS idx_base_5311_cpf_corrigido_digits
  ON public.base_5311 ((regexp_replace(COALESCE(cpf_corrigido,''), '\D', '', 'g')));
CREATE INDEX IF NOT EXISTS idx_base_5311_cpf_digits
  ON public.base_5311 ((regexp_replace(COALESCE(cpf,''), '\D', '', 'g')));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.base_5311 TO authenticated;
GRANT ALL ON public.base_5311 TO service_role;

ALTER TABLE public.base_5311 ENABLE ROW LEVEL SECURITY;

-- Leitura: operacional + consultor
CREATE POLICY "Base5311 select roles" ON public.base_5311
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operador_chefe')
    OR public.has_role(auth.uid(), 'operador')
    OR public.has_role(auth.uid(), 'consultor')
  );

-- Mutações: admin only
CREATE POLICY "Base5311 insert admin" ON public.base_5311
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Base5311 update admin" ON public.base_5311
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Base5311 delete admin" ON public.base_5311
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_base_5311_updated_at ON public.base_5311;
CREATE TRIGGER trg_base_5311_updated_at
  BEFORE UPDATE ON public.base_5311
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger
DROP TRIGGER IF EXISTS trg_base_5311_audit ON public.base_5311;
CREATE TRIGGER trg_base_5311_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.base_5311
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- 2) Helper: verifica se CPF está na base_5311 (compara contra cpf_corrigido)
CREATE OR REPLACE FUNCTION public.is_in_base_5311(p_cpf TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_cpf IS NULL OR p_cpf = '' THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.base_5311
      WHERE regexp_replace(COALESCE(cpf_corrigido,''), '\D', '', 'g')
            = regexp_replace(p_cpf, '\D', '', 'g')
        AND regexp_replace(COALESCE(cpf_corrigido,''), '\D', '', 'g') <> ''
    )
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_in_base_5311(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_in_base_5311(TEXT) TO authenticated, service_role;

-- 3) Atualizar get_despacho_decrypted para incluir in_base_5311
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
      SELECT d.id, d.numos, d.dias_para_despacho, d.inconsistencia, d.nomelcd, d.regional,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(d.nomecli) ELSE '***' END as nomecli,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(d.numcpf) ELSE '***' END as numcpf,
        CASE WHEN v_is_operational THEN d.dth_nascimento ELSE NULL END as dth_nascimento,
        d.responsavel, d.tratativa, d.motivo_da_improcedencia,
        d.base, d.familia,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(d.telefone) ELSE '***' END as telefone,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(d.email) ELSE '***' END as email,
        d.complemento, d.dsclgr_os, d.criterio, d.concluida, d.data_conclusao,
        d.created_at, d.updated_at, d.deleted_at, d.deleted_by,
        EXISTS (
          SELECT 1 FROM public.base_5311 b
          WHERE regexp_replace(COALESCE(b.cpf_corrigido,''), '\D', '', 'g')
                = regexp_replace(COALESCE(public.decrypt_sensitive(d.numcpf),''), '\D', '', 'g')
            AND regexp_replace(COALESCE(b.cpf_corrigido,''), '\D', '', 'g') <> ''
        ) AS in_base_5311
      FROM public.despacho d
      WHERE d.deleted_at IS NULL
        AND (p_show_concluded OR d.tratativa != 'Concluída')
      ORDER BY d.created_at DESC
    ) t
  );
END;
$function$;

-- 4) Atualizar get_caderno_decrypted para incluir in_base_5311
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
      SELECT c.id, c.numos, c.numobra, c.status, c.nomelcd, c.regional, c.controle_os, c.origem, c.prazo,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(c.nomecli) ELSE '***' END as nomecli,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(c.numcpf) ELSE '***' END as numcpf,
        CASE WHEN v_is_operational THEN c.dth_nascimento ELSE NULL END as dth_nascimento,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(c.email) ELSE '***' END as email,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(c.numtel) ELSE '***' END as numtel,
        CASE WHEN v_is_operational THEN public.decrypt_sensitive(c.numtel2) ELSE '***' END as numtel2,
        c.complemento, c.dsclgr_os, c.motivo_improcedencia, c.pendencia_obra, c.criterio,
        c.tipo_carta_enviada, c.base_5311, c.tranche, c.responsavel, c.prioridade, c.observacao,
        c.empreiteira, c.bloco_cliente, c.data_carta, c.datasol, c.datacontab, c.data_766,
        c.dataprev, c.datatertrab, c.dth_envio_dineng, c.dth_retorno_dineng, c.dth_impedimento,
        c.data_recebimento, c.created_at, c.updated_at, c.deleted_at, c.deleted_by,
        EXISTS (
          SELECT 1 FROM public.base_5311 b
          WHERE regexp_replace(COALESCE(b.cpf_corrigido,''), '\D', '', 'g')
                = regexp_replace(COALESCE(public.decrypt_sensitive(c.numcpf),''), '\D', '', 'g')
            AND regexp_replace(COALESCE(b.cpf_corrigido,''), '\D', '', 'g') <> ''
        ) AS in_base_5311
      FROM public.caderno c
      WHERE (p_show_deleted OR c.deleted_at IS NULL)
      ORDER BY c.created_at DESC
    ) t
  );
END;
$function$;

-- 5) Atualizar trigger de encriptação do Caderno para popular base_5311 antes da criptografia
CREATE OR REPLACE FUNCTION public.encrypt_caderno_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_plain_cpf TEXT;
BEGIN
  -- Captura o CPF em texto puro, se possível
  IF NEW.numcpf IS NOT NULL AND NEW.numcpf <> '' THEN
    IF NEW.numcpf LIKE 'ENC:%' THEN
      v_plain_cpf := public.decrypt_sensitive(NEW.numcpf);
    ELSE
      v_plain_cpf := NEW.numcpf;
    END IF;

    -- Preenche base_5311 automaticamente (SIM/NÃO) baseado no CPF corrigido
    IF v_plain_cpf IS NOT NULL AND v_plain_cpf <> '' THEN
      NEW.base_5311 := CASE
        WHEN EXISTS (
          SELECT 1 FROM public.base_5311 b
          WHERE regexp_replace(COALESCE(b.cpf_corrigido,''), '\D', '', 'g')
                = regexp_replace(v_plain_cpf, '\D', '', 'g')
            AND regexp_replace(COALESCE(b.cpf_corrigido,''), '\D', '', 'g') <> ''
        ) THEN 'SIM'
        ELSE 'NÃO'
      END;
    END IF;
  END IF;

  -- Criptografia dos campos sensíveis
  NEW.numcpf := public.encrypt_sensitive(NEW.numcpf);
  NEW.nomecli := public.encrypt_sensitive(NEW.nomecli);
  NEW.email := public.encrypt_sensitive(NEW.email);
  NEW.numtel := public.encrypt_sensitive(NEW.numtel);
  NEW.numtel2 := public.encrypt_sensitive(NEW.numtel2);
  RETURN NEW;
END;
$function$;
