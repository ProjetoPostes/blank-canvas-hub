
-- 1. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- 2. Secure config table
CREATE TABLE IF NOT EXISTS public.encryption_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  encryption_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.encryption_config ENABLE ROW LEVEL SECURITY;

-- 3. Generate key
INSERT INTO public.encryption_config (id, encryption_key)
VALUES ('default', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (id) DO NOTHING;

-- 4. Get key helper
CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_key TEXT;
BEGIN
  SELECT encryption_key INTO v_key FROM public.encryption_config WHERE id = 'default';
  RETURN v_key;
END;
$$;

-- 5. Encrypt function
CREATE OR REPLACE FUNCTION public.encrypt_sensitive(p_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_key TEXT;
BEGIN
  IF p_text IS NULL OR p_text = '' THEN RETURN p_text; END IF;
  IF p_text LIKE 'ENC:%' THEN RETURN p_text; END IF;
  SELECT encryption_key INTO v_key FROM public.encryption_config WHERE id = 'default';
  RETURN 'ENC:' || encode(extensions.pgp_sym_encrypt(p_text, v_key), 'base64');
END;
$$;

-- 6. Decrypt function
CREATE OR REPLACE FUNCTION public.decrypt_sensitive(p_encrypted TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_key TEXT;
BEGIN
  IF p_encrypted IS NULL OR p_encrypted = '' THEN RETURN p_encrypted; END IF;
  IF NOT (p_encrypted LIKE 'ENC:%') THEN RETURN p_encrypted; END IF;
  SELECT encryption_key INTO v_key FROM public.encryption_config WHERE id = 'default';
  RETURN extensions.pgp_sym_decrypt(decode(substring(p_encrypted FROM 5), 'base64'), v_key);
EXCEPTION WHEN OTHERS THEN
  RETURN p_encrypted;
END;
$$;

-- Revoke direct access to sensitive functions
REVOKE EXECUTE ON FUNCTION public.get_encryption_key() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_sensitive(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_sensitive(TEXT) FROM PUBLIC, anon, authenticated;

-- 7. Encrypt existing caderno data
UPDATE caderno SET
  numcpf = public.encrypt_sensitive(numcpf),
  nomecli = public.encrypt_sensitive(nomecli),
  email = public.encrypt_sensitive(email),
  numtel = public.encrypt_sensitive(numtel),
  numtel2 = public.encrypt_sensitive(numtel2);

-- 8. Encrypt existing despacho data
UPDATE despacho SET
  numcpf = public.encrypt_sensitive(numcpf),
  nomecli = public.encrypt_sensitive(nomecli),
  email = public.encrypt_sensitive(email),
  telefone = public.encrypt_sensitive(telefone);

-- 9. Caderno trigger
CREATE OR REPLACE FUNCTION public.encrypt_caderno_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  NEW.numcpf := public.encrypt_sensitive(NEW.numcpf);
  NEW.nomecli := public.encrypt_sensitive(NEW.nomecli);
  NEW.email := public.encrypt_sensitive(NEW.email);
  NEW.numtel := public.encrypt_sensitive(NEW.numtel);
  NEW.numtel2 := public.encrypt_sensitive(NEW.numtel2);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_encrypt_caderno
BEFORE INSERT OR UPDATE ON caderno
FOR EACH ROW EXECUTE FUNCTION encrypt_caderno_trigger();

-- 10. Despacho trigger
CREATE OR REPLACE FUNCTION public.encrypt_despacho_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  NEW.numcpf := public.encrypt_sensitive(NEW.numcpf);
  NEW.nomecli := public.encrypt_sensitive(NEW.nomecli);
  NEW.email := public.encrypt_sensitive(NEW.email);
  NEW.telefone := public.encrypt_sensitive(NEW.telefone);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_encrypt_despacho
BEFORE INSERT OR UPDATE ON despacho
FOR EACH ROW EXECUTE FUNCTION encrypt_despacho_trigger();

-- 11. RPC: Get caderno decrypted
CREATE OR REPLACE FUNCTION public.get_caderno_decrypted(p_show_deleted BOOLEAN DEFAULT false)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador_chefe') OR
    has_role(auth.uid(), 'operador') OR has_role(auth.uid(), 'consultor')
  ) THEN RETURN '[]'::JSON; END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
    FROM (
      SELECT id, numos, numobra, status, nomelcd, regional, controle_os, origem, prazo,
        public.decrypt_sensitive(nomecli) as nomecli,
        public.decrypt_sensitive(numcpf) as numcpf,
        dth_nascimento,
        public.decrypt_sensitive(email) as email,
        public.decrypt_sensitive(numtel) as numtel,
        public.decrypt_sensitive(numtel2) as numtel2,
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
$$;

-- 12. RPC: Get despacho decrypted
CREATE OR REPLACE FUNCTION public.get_despacho_decrypted(p_show_concluded BOOLEAN DEFAULT false)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador_chefe') OR
    has_role(auth.uid(), 'operador') OR has_role(auth.uid(), 'consultor')
  ) THEN RETURN '[]'::JSON; END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
    FROM (
      SELECT id, numos, dias_para_despacho, inconsistencia, nomelcd, regional,
        public.decrypt_sensitive(nomecli) as nomecli,
        public.decrypt_sensitive(numcpf) as numcpf,
        dth_nascimento, responsavel, tratativa, motivo_da_improcedencia,
        base, familia,
        public.decrypt_sensitive(telefone) as telefone,
        public.decrypt_sensitive(email) as email,
        complemento, dsclgr_os, criterio, concluida, data_conclusao,
        created_at, updated_at, deleted_at, deleted_by
      FROM despacho
      WHERE deleted_at IS NULL
        AND (p_show_concluded OR tratativa != 'Concluída')
      ORDER BY created_at DESC
    ) t
  );
END;
$$;

-- 13. RPC: Find cliente duplicatas
CREATE OR REPLACE FUNCTION public.find_cliente_duplicatas(p_numcpf TEXT, p_current_numos BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_despacho_os JSON; v_caderno_os JSON;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador_chefe') OR
    has_role(auth.uid(), 'operador') OR has_role(auth.uid(), 'consultor')
  ) THEN
    RETURN json_build_object('despachoOS', '[]'::JSON, 'cadernoOS', '[]'::JSON);
  END IF;

  SELECT COALESCE(json_agg(numos), '[]'::JSON) INTO v_despacho_os
  FROM despacho
  WHERE public.decrypt_sensitive(numcpf) = p_numcpf
    AND numos != p_current_numos AND deleted_at IS NULL;

  SELECT COALESCE(json_agg(numos), '[]'::JSON) INTO v_caderno_os
  FROM caderno
  WHERE public.decrypt_sensitive(numcpf) = p_numcpf
    AND deleted_at IS NULL;

  RETURN json_build_object('despachoOS', v_despacho_os, 'cadernoOS', v_caderno_os);
END;
$$;
