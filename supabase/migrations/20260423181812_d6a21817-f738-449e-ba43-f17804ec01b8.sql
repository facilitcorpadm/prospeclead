-- Ciclo de cobrança
DO $$ BEGIN
  CREATE TYPE public.billing_cycle AS ENUM ('once', 'monthly', 'annual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS franchise TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle public.billing_cycle NOT NULL DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS adhesion_fee NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_franchise ON public.products(franchise);