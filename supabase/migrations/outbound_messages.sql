-- Tabela para mensagens de saída do CRM para WhatsApp
CREATE TABLE IF NOT EXISTS outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  sender TEXT DEFAULT 'admin',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE outbound_messages;

-- Índice para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_outbound_pending ON outbound_messages(status, created_at) WHERE status = 'pending';