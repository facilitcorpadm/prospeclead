CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system settings" ON public.system_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert system settings" ON public.system_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update system settings" ON public.system_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.system_settings (key, value) VALUES
  ('WHATSAPP_TOKEN', 'EAANJP9O0LwkBRXo9F64560ZBvTvTEy7k3w13ZAZClRkNDZBWClMEoTVjSZAoRyw9z5OYypLqBBirSV7BldAW5QL3fAeuxjHrWOc6jzkXws7xlM1HBHYEEhucBL9ccbiEE2x24LvZBZBqAb6Wkemwf6QOSH91hQTurMMnccYjlUqhYqBiDOL1JZBYykwgJqEKAQZDZD')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();