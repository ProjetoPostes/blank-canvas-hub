-- Update RLS policies for chat_messages to restrict access to admin, operador_chefe, operador only

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages as sender" ON public.chat_messages;

-- Create new SELECT policy with role validation
CREATE POLICY "Users can view their messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  (sender_id = auth.uid() OR recipient_id = auth.uid()::text)
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'operador_chefe', 'operador')
  )
);

-- Create new INSERT policy with role validation
CREATE POLICY "Users can send messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'operador_chefe', 'operador')
  )
);