
-- ========== PDVs (Pontos de Venda parceiros) ==========
CREATE TABLE public.pdvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  cnpj TEXT,
  manager_name TEXT,
  whatsapp TEXT,
  city TEXT,
  state TEXT,
  reward_per_lead NUMERIC NOT NULL DEFAULT 0.50,
  active BOOLEAN NOT NULL DEFAULT true,
  leads_count INTEGER NOT NULL DEFAULT 0,
  last_lead_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pdvs_user ON public.pdvs(user_id);
CREATE INDEX idx_pdvs_short_code ON public.pdvs(short_code);

ALTER TABLE public.pdvs ENABLE ROW LEVEL SECURITY;

-- Promoter: CRUD nos próprios
CREATE POLICY "Own pdvs select"  ON public.pdvs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own pdvs insert"  ON public.pdvs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own pdvs update"  ON public.pdvs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own pdvs delete"  ON public.pdvs FOR DELETE USING (auth.uid() = user_id);

-- Admin: tudo
CREATE POLICY "Admins manage all pdvs" ON public.pdvs FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Público: leitura mínima (apenas para resolver o QR)
CREATE POLICY "Public read active pdv by code"
  ON public.pdvs FOR SELECT
  USING (active = true);

-- Trigger updated_at
CREATE TRIGGER pdvs_set_updated_at
BEFORE UPDATE ON public.pdvs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== Leads capturados via PDV ==========
CREATE TABLE public.pdv_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdv_id UUID NOT NULL REFERENCES public.pdvs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- promoter dono
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  note TEXT,
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pdv_leads_pdv ON public.pdv_leads(pdv_id);
CREATE INDEX idx_pdv_leads_user ON public.pdv_leads(user_id);

ALTER TABLE public.pdv_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own pdv_leads select" ON public.pdv_leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins all pdv_leads" ON public.pdv_leads FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ========== Função pública de captura ==========
-- Aceita o código curto do QR e cria: lead + pdv_lead + crédito na carteira.
-- SECURITY DEFINER pra escapar das RLS de leads/wallet quando vier de visitante anônimo.
CREATE OR REPLACE FUNCTION public.capture_pdv_lead(
  _short_code TEXT,
  _contact_name TEXT,
  _contact_phone TEXT DEFAULT NULL,
  _note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pdv RECORD;
  _new_lead_id UUID;
BEGIN
  IF _contact_name IS NULL OR length(trim(_contact_name)) = 0 THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;

  SELECT * INTO _pdv FROM public.pdvs WHERE short_code = _short_code AND active = true;
  IF _pdv IS NULL THEN
    RAISE EXCEPTION 'PDV não encontrado ou inativo';
  END IF;

  -- Cria o lead B2C atribuído ao promoter dono do PDV
  INSERT INTO public.leads (user_id, kind, name, phone, status, city, captured_at)
  VALUES (_pdv.user_id, 'b2c', _contact_name, _contact_phone, 'coletado', _pdv.city, now())
  RETURNING id INTO _new_lead_id;

  -- Registro vinculando ao PDV
  INSERT INTO public.pdv_leads (pdv_id, user_id, lead_id, contact_name, contact_phone, note, reward_amount)
  VALUES (_pdv.id, _pdv.user_id, _new_lead_id, _contact_name, _contact_phone, _note, _pdv.reward_per_lead);

  -- Crédito automático (renda passiva) — só se reward_per_lead > 0
  IF _pdv.reward_per_lead > 0 THEN
    INSERT INTO public.wallet_transactions (user_id, kind, source, amount, description, lead_id)
    VALUES (
      _pdv.user_id, 'credit', 'lead_b2c', _pdv.reward_per_lead,
      'Renda passiva PDV — ' || _pdv.name, _new_lead_id
    );
    UPDATE public.profiles
       SET monthly_earnings = monthly_earnings + _pdv.reward_per_lead,
           updated_at = now()
     WHERE id = _pdv.user_id;
  END IF;

  -- Atualiza estatística do PDV
  UPDATE public.pdvs
     SET leads_count = leads_count + 1,
         last_lead_at = now()
   WHERE id = _pdv.id;

  RETURN jsonb_build_object(
    'ok', true,
    'lead_id', _new_lead_id,
    'pdv_name', _pdv.name,
    'reward', _pdv.reward_per_lead
  );
END;
$$;

-- Permite invocar como anônimo (visitante do QR)
GRANT EXECUTE ON FUNCTION public.capture_pdv_lead(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ========== Geração de short_code automático ==========
CREATE OR REPLACE FUNCTION public.gen_pdv_short_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _candidate TEXT;
  _exists INT;
BEGIN
  IF NEW.short_code IS NULL OR length(NEW.short_code) = 0 THEN
    LOOP
      _candidate := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      SELECT 1 INTO _exists FROM public.pdvs WHERE short_code = _candidate;
      EXIT WHEN _exists IS NULL;
    END LOOP;
    NEW.short_code := _candidate;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pdvs_set_short_code
BEFORE INSERT ON public.pdvs
FOR EACH ROW EXECUTE FUNCTION public.gen_pdv_short_code();
