-- =========================================================
-- 1. ENUM para plano
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.plan_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 2. TABELA app_settings (singleton com id fixo = 1)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- Geral
  brand_name text NOT NULL DEFAULT 'Minha Marca',
  brand_logo_url text,
  primary_color text NOT NULL DEFAULT '#2563eb',
  plan public.plan_tier NOT NULL DEFAULT 'free',

  -- Integrações
  whatsapp_connected boolean NOT NULL DEFAULT false,
  whatsapp_phone_id text,
  whatsapp_webhook_url text,
  whatsapp_token text,

  payment_gateway_connected boolean NOT NULL DEFAULT false,
  payment_pix_key text,
  payment_api_key text,

  -- Comissões
  commission_sale_percent numeric NOT NULL DEFAULT 5.0,
  commission_capture_fixed numeric NOT NULL DEFAULT 2.0,
  commission_goal_bonus numeric NOT NULL DEFAULT 100.0,

  -- Limites
  limit_max_promoters integer NOT NULL DEFAULT 50,
  limit_max_leads_month integer NOT NULL DEFAULT 5000,

  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Insere a linha única
INSERT INTO public.app_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins update settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =========================================================
-- 3. BUCKET branding (público) para logo
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Branding public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

CREATE POLICY "Admins upload branding"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'branding' AND public.is_admin());

CREATE POLICY "Admins update branding"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'branding' AND public.is_admin());

CREATE POLICY "Admins delete branding"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'branding' AND public.is_admin());