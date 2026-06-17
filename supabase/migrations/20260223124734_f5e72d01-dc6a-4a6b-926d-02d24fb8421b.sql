
CREATE OR REPLACE FUNCTION public.list_operadores()
RETURNS TABLE(user_id uuid, full_name text, cargo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que o chamador tem role operacional
  IF NOT (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'operador_chefe') OR
    has_role(auth.uid(), 'operador')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT p.user_id, p.full_name, p.cargo
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('admin', 'operador_chefe', 'operador');
END;
$$;
