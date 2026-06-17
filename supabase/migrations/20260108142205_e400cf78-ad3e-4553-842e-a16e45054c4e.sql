
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'operador_chefe', 'operador');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
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

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create despacho table
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

ALTER TABLE public.despacho ENABLE ROW LEVEL SECURITY;

-- RLS for despacho - all authenticated users can view, operators can update
CREATE POLICY "Authenticated users can view despacho"
ON public.despacho FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Operators can insert despacho"
ON public.despacho FOR INSERT TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'operador_chefe') OR 
    public.has_role(auth.uid(), 'operador')
);

CREATE POLICY "Operators can update despacho"
ON public.despacho FOR UPDATE TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'operador_chefe') OR 
    public.has_role(auth.uid(), 'operador')
);

CREATE POLICY "Admins can delete despacho"
ON public.despacho FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create caderno table
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

ALTER TABLE public.caderno ENABLE ROW LEVEL SECURITY;

-- RLS for caderno
CREATE POLICY "Authenticated users can view caderno"
ON public.caderno FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Operators can insert caderno"
ON public.caderno FOR INSERT TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'operador_chefe') OR 
    public.has_role(auth.uid(), 'operador')
);

CREATE POLICY "Operators can update caderno"
ON public.caderno FOR UPDATE TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'operador_chefe') OR 
    public.has_role(auth.uid(), 'operador')
);

CREATE POLICY "Admins can delete caderno"
ON public.caderno FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create demandas table for task distribution
CREATE TABLE public.demandas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT NOT NULL,
    prioridade TEXT DEFAULT 'Normal',
    status TEXT DEFAULT 'Pendente',
    prazo_execucao DATE,
    operador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

-- RLS for demandas
CREATE POLICY "Operators can view their own demandas"
ON public.demandas FOR SELECT TO authenticated
USING (
    operador_id = auth.uid() OR
    criado_por = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'operador_chefe')
);

CREATE POLICY "Chefes can create demandas"
ON public.demandas FOR INSERT TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'operador_chefe')
);

CREATE POLICY "Chefes can update demandas"
ON public.demandas FOR UPDATE TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'operador_chefe') OR
    operador_id = auth.uid()
);

CREATE POLICY "Admins can delete demandas"
ON public.demandas FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador_chefe'));

-- Triggers for updated_at
CREATE TRIGGER update_despacho_updated_at
BEFORE UPDATE ON public.despacho
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_caderno_updated_at
BEFORE UPDATE ON public.caderno
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_demandas_updated_at
BEFORE UPDATE ON public.demandas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
