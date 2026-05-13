-- =========================================================
-- 1. ENUMS para aprovação, KYC, onboarding e contracheque
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM ('pendente', 'aprovado', 'rejeitado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.kyc_status AS ENUM ('nao_enviado', 'em_analise', 'aprovado', 'rejeitado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payslip_status AS ENUM ('rascunho', 'emitido', 'pago');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 2. ADIÇÕES NA TABELA profiles
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status public.approval_status NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS kyc_status public.kyc_status NOT NULL DEFAULT 'nao_enviado',
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kyc_doc_selfie_url text,
  ADD COLUMN IF NOT EXISTS kyc_doc_id_front_url text,
  ADD COLUMN IF NOT EXISTS kyc_doc_id_back_url text,
  ADD COLUMN IF NOT EXISTS kyc_doc_address_url text,
  ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS kyc_notes text,
  ADD COLUMN IF NOT EXISTS approval_notes text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Backfill: registros que já existem viram aprovados ativos
UPDATE public.profiles SET approval_status = 'aprovado' WHERE approval_status = 'pendente' AND created_at < now() - interval '1 minute';

-- =========================================================
-- 3. TABELA payslips (contracheques)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference_month date NOT NULL,         -- usar dia 1 do mês
  gross_amount numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  status public.payslip_status NOT NULL DEFAULT 'rascunho',
  pdf_url text,
  notes text,
  issued_at timestamptz,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_payslips_user ON public.payslips(user_id);
CREATE INDEX IF NOT EXISTS idx_payslips_month ON public.payslips(reference_month);

CREATE TRIGGER trg_payslips_updated_at
  BEFORE UPDATE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payslips"
  ON public.payslips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all payslips"
  ON public.payslips FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "RH view all payslips"
  ON public.payslips FOR SELECT
  USING (public.is_rh());

CREATE POLICY "RH insert payslips"
  ON public.payslips FOR INSERT
  WITH CHECK (public.is_rh());

CREATE POLICY "RH update payslips"
  ON public.payslips FOR UPDATE
  USING (public.is_rh())
  WITH CHECK (public.is_rh());

-- =========================================================
-- 4. STORAGE: bucket kyc-documents (privado)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Estrutura: kyc-documents/{user_id}/{tipo}.{ext}
CREATE POLICY "Users upload own KYC docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users view own KYC docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own KYC docs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own KYC docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins view all KYC docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc-documents' AND public.is_admin());

CREATE POLICY "RH view all KYC docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc-documents' AND public.is_rh());