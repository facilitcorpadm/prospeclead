-- =====================================================
-- WALLET DIGITAL — Transações + Saques PIX
-- =====================================================

-- 1. Enums
CREATE TYPE public.wallet_tx_kind AS ENUM ('credit', 'debit', 'withdraw_hold', 'withdraw_paid', 'withdraw_refund', 'bonus', 'adjustment');
CREATE TYPE public.wallet_tx_source AS ENUM ('lead_b2c', 'lead_b2b', 'manual', 'withdrawal', 'mission');
CREATE TYPE public.withdrawal_status AS ENUM ('pendente', 'aprovado', 'pago', 'rejeitado', 'cancelado');
CREATE TYPE public.pix_key_kind AS ENUM ('cpf', 'cnpj', 'email', 'phone', 'random');

-- 2. Tabela de transações
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind public.wallet_tx_kind NOT NULL,
  source public.wallet_tx_source NOT NULL DEFAULT 'manual',
  amount NUMERIC(12,2) NOT NULL, -- positivo = crédito, negativo = débito
  description TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  withdrawal_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_tx_lead ON public.wallet_transactions(lead_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own wallet tx select" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own wallet tx insert" ON public.wallet_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Tabela de saques
CREATE TABLE public.wallet_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  pix_key TEXT NOT NULL,
  pix_key_kind public.pix_key_kind NOT NULL,
  holder_name TEXT NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pendente',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawals_user ON public.wallet_withdrawals(user_id, requested_at DESC);

ALTER TABLE public.wallet_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own withdrawals select" ON public.wallet_withdrawals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own withdrawals insert" ON public.wallet_withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own withdrawals update" ON public.wallet_withdrawals
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Trigger updated_at
CREATE TRIGGER trg_withdrawals_updated_at
  BEFORE UPDATE ON public.wallet_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Função: saldo do usuário
CREATE OR REPLACE FUNCTION public.wallet_balance(_user_id UUID)
RETURNS TABLE (
  available NUMERIC,
  pending NUMERIC,
  withdrawn NUMERIC,
  total_earned NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(amount), 0) AS available,
    COALESCE((SELECT SUM(amount) FROM public.wallet_withdrawals
              WHERE user_id = _user_id AND status IN ('pendente','aprovado')), 0) AS pending,
    COALESCE((SELECT SUM(amount) FROM public.wallet_withdrawals
              WHERE user_id = _user_id AND status = 'pago'), 0) AS withdrawn,
    COALESCE(SUM(amount) FILTER (WHERE amount > 0 AND kind IN ('credit','bonus','adjustment')), 0) AS total_earned
  FROM public.wallet_transactions
  WHERE user_id = _user_id;
$$;

-- 6. Trigger: credita carteira ao vender lead
CREATE OR REPLACE FUNCTION public.handle_lead_sold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _amount NUMERIC;
  _src public.wallet_tx_source;
  _desc TEXT;
  _existing INT;
BEGIN
  -- Só age na transição para vendido/fechado
  IF NEW.status NOT IN ('vendido', 'fechado') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Evita crédito duplicado para o mesmo lead
  SELECT COUNT(*) INTO _existing
  FROM public.wallet_transactions
  WHERE lead_id = NEW.id AND kind = 'credit';
  IF _existing > 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.kind = 'b2c' THEN
    _amount := COALESCE(NEW.value, 2.00);
    _src := 'lead_b2c';
    _desc := 'Lead B2C convertido' || CASE WHEN NEW.vehicle_plate IS NOT NULL THEN ' — placa ' || NEW.vehicle_plate ELSE '' END;
  ELSE
    -- B2B: R$10 garantidos + 1% do valor (TCV) se informado
    _amount := 10.00 + COALESCE(NEW.value, 0) * 0.01;
    _src := 'lead_b2b';
    _desc := 'Lead B2B fechado — ' || COALESCE(NEW.name, 'empresa');
  END IF;

  INSERT INTO public.wallet_transactions (user_id, kind, source, amount, description, lead_id)
  VALUES (NEW.user_id, 'credit', _src, _amount, _desc, NEW.id);

  -- Atualiza monthly_earnings no profile
  UPDATE public.profiles
  SET monthly_earnings = monthly_earnings + _amount,
      updated_at = now()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_sold_credit
  AFTER INSERT OR UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_lead_sold();

-- 7. Trigger: debita ao solicitar saque, devolve se rejeitado/cancelado
CREATE OR REPLACE FUNCTION public.handle_withdrawal_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bal NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Verifica saldo
    SELECT available INTO _bal FROM public.wallet_balance(NEW.user_id);
    IF _bal < NEW.amount THEN
      RAISE EXCEPTION 'Saldo insuficiente. Disponível: R$ %', _bal;
    END IF;

    INSERT INTO public.wallet_transactions (user_id, kind, source, amount, description, withdrawal_id)
    VALUES (NEW.user_id, 'withdraw_hold', 'withdrawal', -NEW.amount,
            'Saque PIX solicitado — ' || NEW.pix_key, NEW.id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    IF NEW.status IN ('rejeitado', 'cancelado') AND OLD.status IN ('pendente', 'aprovado') THEN
      INSERT INTO public.wallet_transactions (user_id, kind, source, amount, description, withdrawal_id)
      VALUES (NEW.user_id, 'withdraw_refund', 'withdrawal', NEW.amount,
              'Saque ' || NEW.status || ' — estorno', NEW.id);
    ELSIF NEW.status = 'pago' THEN
      NEW.processed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_withdrawal_insert
  AFTER INSERT ON public.wallet_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.handle_withdrawal_change();

CREATE TRIGGER trg_withdrawal_update
  BEFORE UPDATE ON public.wallet_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.handle_withdrawal_change();
