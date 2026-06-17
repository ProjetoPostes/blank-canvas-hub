-- Add file column to chat_messages for storing file data from webhook responses
ALTER TABLE public.chat_messages 
ADD COLUMN file JSONB NULL;

-- Add comment explaining the file structure
COMMENT ON COLUMN public.chat_messages.file IS 'File data from webhook: {name: string, type: string, data: string (base64 or url), size?: number}';