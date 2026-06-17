-- Tabela para armazenar configuração de 2FA obrigatório por role
CREATE TABLE public.mfa_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role UNIQUE NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir todas as roles com 2FA desabilitado por padrão
INSERT INTO public.mfa_requirements (role, required) VALUES
  ('admin', false),
  ('operador_chefe', false),
  ('operador', false),
  ('consultor', false);

-- Habilitar RLS
ALTER TABLE public.mfa_requirements ENABLE ROW LEVEL SECURITY;

-- Políticas: todos autenticados podem ler, apenas admin pode modificar
CREATE POLICY "Authenticated users can view mfa requirements"
  ON public.mfa_requirements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update mfa requirements"
  ON public.mfa_requirements FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_mfa_requirements_updated_at
  BEFORE UPDATE ON public.mfa_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para verificar se usuário precisa de MFA
CREATE OR REPLACE FUNCTION public.check_user_mfa_requirement(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_roles TEXT[];
  v_required_roles TEXT[];
  v_requires_mfa BOOLEAN := false;
BEGIN
  -- Buscar roles do usuário
  SELECT ARRAY_AGG(role::TEXT) INTO v_user_roles
  FROM public.user_roles
  WHERE user_id = p_user_id;
  
  -- Se não tem roles, não exige MFA
  IF v_user_roles IS NULL THEN
    RETURN jsonb_build_object(
      'requires_mfa', false,
      'reason', 'Usuário sem roles'
    );
  END IF;
  
  -- Buscar roles que exigem MFA
  SELECT ARRAY_AGG(role::TEXT) INTO v_required_roles
  FROM public.mfa_requirements
  WHERE required = true;
  
  -- Verificar se alguma role do usuário exige MFA
  IF v_required_roles IS NOT NULL THEN
    v_requires_mfa := v_user_roles && v_required_roles;
  END IF;
  
  RETURN jsonb_build_object(
    'requires_mfa', v_requires_mfa,
    'user_roles', v_user_roles,
    'required_roles', COALESCE(v_required_roles, ARRAY[]::TEXT[])
  );
END;
$$;