-- Tabela de mensagens do chat
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id TEXT NOT NULL, -- user_id (uuid string) ou 'cumulo' para automação
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para buscar mensagens de uma conversa
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_chat_messages_recipient ON public.chat_messages (recipient_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver mensagens onde são remetente ou destinatário
CREATE POLICY "Users can view their own messages"
ON public.chat_messages
FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid()::text = recipient_id
);

-- Policy: Usuários podem inserir mensagens onde são o remetente
CREATE POLICY "Users can insert messages as sender"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Habilitar realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;