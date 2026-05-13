// Cliente Supabase dedicado ao projeto do n8n (ProspecLead CRM - produção)
// Separado do cliente principal pois o n8n salva mensagens em outro projeto Supabase.
import { createClient } from '@supabase/supabase-js';

const N8N_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const N8N_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const n8nSupabase = createClient(N8N_SUPABASE_URL, N8N_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // sem sessão de auth — só consultas públicas
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
