INSERT INTO public.system_settings (key, value) VALUES
  ('WHATSAPP_TOKEN', 'EAANJP9O0LwkBRaKMF0a32hQ4CLf6zujMQmgeVy5XpvdIpZBeOkm3ZBbjkca6iMdki05VABgcWgFdZARbPczPQoeIed8PZCZBpH6ZCVraeNeftxWOY4Fx5gk6OFV0nSsZAJQpms7RMvpssNVS4uxTK3n3tW0wtZB7aJBPTWiR1ZBMssYMpm7ZAaffpRgyzNMqZAX9gZDZD'),
  ('WHATSAPP_PHONE_NUMBER_ID', '1085084534695085'),
  ('WHATSAPP_BUSINESS_ACCOUNT_ID', '952649557371257'),
  ('WHATSAPP_VERIFY_TOKEN', 'prospeclead_2026_A7f9Xz')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Garantir que a tabela de histórico exista no projeto principal
CREATE TABLE IF NOT EXISTS public.n8n_chat_histories (
    id                  bigserial PRIMARY KEY,
    session_id          text NOT NULL,
    message             jsonb NOT NULL,
    hora_data_mensagem  timestamptz DEFAULT now()
);

-- Ativar Realtime para mensagens instantâneas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'n8n_chat_histories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE n8n_chat_histories;
  END IF;
END $$;

-- RLS (Acesso total para simplificar o CRM omnichannel)
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_n8n_chat" ON public.n8n_chat_histories;
CREATE POLICY "allow_all_n8n_chat" ON public.n8n_chat_histories FOR ALL USING (true) WITH CHECK (true);
