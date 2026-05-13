ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS brand_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS contact_responsible TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_city TEXT,
  ADD COLUMN IF NOT EXISTS contact_state TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS asaas_api_key TEXT,
  ADD COLUMN IF NOT EXISTS asaas_connected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smartgps_token TEXT,
  ADD COLUMN IF NOT EXISTS smartgps_base_url TEXT,
  ADD COLUMN IF NOT EXISTS smartgps_connected BOOLEAN NOT NULL DEFAULT false;