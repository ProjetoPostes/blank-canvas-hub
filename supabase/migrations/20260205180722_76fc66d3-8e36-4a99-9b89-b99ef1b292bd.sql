-- Adicionar colunas para tipo de demanda e tipo de carta
ALTER TABLE demandas 
ADD COLUMN tipo_demanda text DEFAULT 'Analise',
ADD COLUMN tipo_carta text;