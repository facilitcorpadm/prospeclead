
CREATE TABLE IF NOT EXISTS public.zapi_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL,
  action text NOT NULL,
  phone text,
  message text,
  status text NOT NULL,
  http_status integer,
  zapi_message_id text,
  error text,
  payload jsonb,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zapi_logs_created_at ON public.zapi_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zapi_logs_phone ON public.zapi_logs (phone);

ALTER TABLE public.zapi_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read zapi_logs"
  ON public.zapi_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());
