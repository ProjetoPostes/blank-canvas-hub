
ALTER TABLE public.despacho
ADD COLUMN concluida boolean NOT NULL DEFAULT false,
ADD COLUMN data_conclusao timestamp with time zone;
