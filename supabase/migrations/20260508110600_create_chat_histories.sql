-- Criação da tabela para armazenar o histórico de conversas do WhatsApp (substituindo o n8n)
CREATE TABLE IF NOT EXISTS public.n8n_chat_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    message JSONB NOT NULL,
    hora_data_mensagem TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar o Realtime para atualizar o chat ao vivo no CRM
ALTER PUBLICATION supabase_realtime ADD TABLE n8n_chat_histories;

-- Criar políticas de segurança (RLS)
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Permitir que a role de serviço (Edge Functions) faça inserções
CREATE POLICY "Enable insert for service role" ON public.n8n_chat_histories
    FOR INSERT 
    WITH CHECK (true);

-- Permitir leitura pública/autenticada para o painel de admin
CREATE POLICY "Enable read access for authenticated users" ON public.n8n_chat_histories
    FOR SELECT 
    TO authenticated
    USING (true);

-- Índices para performance na busca de mensagens
CREATE INDEX IF NOT EXISTS idx_chat_histories_session ON public.n8n_chat_histories(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_data ON public.n8n_chat_histories(hora_data_mensagem DESC);
