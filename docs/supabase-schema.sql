-- ============================================================
-- SCRIPT COMPLETO DE MIGRAÇÃO DO BANCO DE DADOS
-- Projeto: Sistema Operacional Interno
-- Gerado em: 2026-01-13
-- ============================================================

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'operador_chefe', 'operador', 'consultor');

-- ============================================================
-- 2. TABELAS
-- ============================================================

-- Tabela: profiles (perfis de usuários)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  cargo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: user_roles (papéis de usuários)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Tabela: audit_logs (logs de auditoria)
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

-- Tabela: notifications (notificações)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: demandas (tarefas/demandas)
CREATE TABLE public.demandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL,
  prioridade TEXT DEFAULT 'Normal',
  status TEXT DEFAULT 'Pendente',
  prazo_execucao DATE,
  operador_id UUID,
  criado_por UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: despacho (controle de despachos)
CREATE TABLE public.despacho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numos BIGINT NOT NULL,
  dias_para_despacho INTEGER,
  inconsistencia INTEGER,
  nomelcd TEXT,
  regional TEXT,
  nomecli TEXT,
  numcpf TEXT,
  dth_nascimento DATE,
  responsavel TEXT,
  tratativa TEXT DEFAULT 'Pendente',
  motivo_da_improcedencia TEXT,
  base TEXT,
  familia TEXT,
  telefone TEXT,
  email TEXT,
  complemento TEXT,
  dsclgr_os TEXT,
  criterio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: caderno (caderno de obras)
CREATE TABLE public.caderno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numos BIGINT NOT NULL,
  numobra BIGINT,
  status TEXT,
  nomelcd TEXT,
  regional TEXT,
  controle_os TEXT DEFAULT 'Aberta',
  origem TEXT,
  prazo TEXT,
  nomecli TEXT,
  numcpf TEXT,
  dth_nascimento TEXT,
  email TEXT,
  numtel TEXT,
  numtel2 TEXT,
  complemento TEXT,
  dsclgr_os TEXT,
  datasol DATE,
  datacontab DATE,
  data_766 DATE,
  dataprev DATE,
  datatertrab DATE,
  dth_envio_dineng DATE,
  dth_retorno_dineng DATE,
  dth_impedimento DATE,
  motivo_improcedencia TEXT,
  pendencia_obra TEXT,
  criterio TEXT,
  tipo_carta_enviada TEXT,
  base_5311 TEXT,
  tranche TEXT,
  responsavel TEXT,
  prioridade TEXT,
  observacao TEXT,
  empreiteira TEXT,
  data_recebimento DATE,
  bloco_cliente TEXT,
  data_carta DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. FUNÇÕES
-- ============================================================

-- Função: update_updated_at_column (atualiza timestamp)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Função: has_role (verifica papel do usuário)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função: log_audit_action (registra ação de auditoria)
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
  v_user_id := auth.uid();
  
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (v_user_id, p_action, p_table_name, p_record_id, p_old_data, p_new_data)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Função: audit_trigger_function (trigger de auditoria)
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
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_user_id, v_action, TG_TABLE_NAME, v_record_id, v_old_data, v_new_data);
  END IF;
  
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Função: handle_new_user (cria perfil automático)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_demandas_updated_at
  BEFORE UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_despacho_updated_at
  BEFORE UPDATE ON public.despacho
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_caderno_updated_at
  BEFORE UPDATE ON public.caderno
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil automaticamente ao registrar usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers de auditoria (opcional - descomente se necessário)
-- CREATE TRIGGER audit_despacho AFTER INSERT OR UPDATE OR DELETE ON public.despacho
--   FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
-- CREATE TRIGGER audit_caderno AFTER INSERT OR UPDATE OR DELETE ON public.caderno
--   FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
-- CREATE TRIGGER audit_demandas AFTER INSERT OR UPDATE OR DELETE ON public.demandas
--   FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
-- CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles
--   FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
-- CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
--   FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despacho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caderno ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Políticas: profiles
-- ============================================================

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_chefe') OR 
  has_role(auth.uid(), 'operador') OR 
  has_role(auth.uid(), 'consultor')
);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own or admins can update all profiles"
ON public.profiles FOR UPDATE
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- Políticas: user_roles
-- ============================================================

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- Políticas: audit_logs
-- ============================================================

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only system functions can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================
-- Políticas: notifications
-- ============================================================

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Only admins and chefes can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador_chefe'));

-- ============================================================
-- Políticas: demandas
-- ============================================================

CREATE POLICY "Operators can view their own demandas"
ON public.demandas FOR SELECT
USING (
  (operador_id = auth.uid()) OR 
  (criado_por = auth.uid()) OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_chefe')
);

CREATE POLICY "Chefes can create demandas"
ON public.demandas FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador_chefe'));

CREATE POLICY "Chefes can update demandas"
ON public.demandas FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_chefe') OR 
  (operador_id = auth.uid())
);

CREATE POLICY "Admins can delete demandas"
ON public.demandas FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador_chefe'));

-- ============================================================
-- Políticas: despacho
-- ============================================================

CREATE POLICY "Operators can view despacho"
ON public.despacho FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_chefe') OR 
  has_role(auth.uid(), 'operador')
);

CREATE POLICY "Operators can insert despacho"
ON public.despacho FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_chefe') OR 
  has_role(auth.uid(), 'operador')
);

CREATE POLICY "Operators can update despacho"
ON public.despacho FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_chefe') OR 
  has_role(auth.uid(), 'operador')
);

CREATE POLICY "Admins can delete despacho"
ON public.despacho FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- Políticas: caderno
-- ============================================================

CREATE POLICY "Operators and consultors can view caderno"
ON public.caderno FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_chefe') OR 
  has_role(auth.uid(), 'operador') OR 
  has_role(auth.uid(), 'consultor')
);

CREATE POLICY "Operators can insert caderno"
ON public.caderno FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_chefe') OR 
  has_role(auth.uid(), 'operador')
);

CREATE POLICY "Operators can update caderno"
ON public.caderno FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_chefe') OR 
  has_role(auth.uid(), 'operador')
);

CREATE POLICY "Admins can delete caderno"
ON public.caderno FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. ÍNDICES (opcional, para performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_demandas_operador_id ON public.demandas(operador_id);
CREATE INDEX IF NOT EXISTS idx_demandas_criado_por ON public.demandas(criado_por);
CREATE INDEX IF NOT EXISTS idx_despacho_numos ON public.despacho(numos);
CREATE INDEX IF NOT EXISTS idx_caderno_numos ON public.caderno(numos);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
