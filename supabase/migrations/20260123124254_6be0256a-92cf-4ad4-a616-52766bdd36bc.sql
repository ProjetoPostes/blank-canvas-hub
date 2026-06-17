-- Criar tabela para documentos de cartas
CREATE TABLE public.documentos_cartas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL,
  url TEXT NOT NULL,
  criado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_documentos_cartas_updated_at
  BEFORE UPDATE ON public.documentos_cartas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.documentos_cartas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view documents"
  ON public.documentos_cartas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert documents"
  ON public.documentos_cartas FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update documents"
  ON public.documentos_cartas FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete documents"
  ON public.documentos_cartas FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Índice para busca por categoria
CREATE INDEX idx_documentos_cartas_categoria ON public.documentos_cartas(categoria);