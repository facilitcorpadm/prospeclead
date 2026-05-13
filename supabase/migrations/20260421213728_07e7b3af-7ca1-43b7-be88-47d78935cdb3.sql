
-- 2. Função helper is_rh()
CREATE OR REPLACE FUNCTION public.is_rh()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'rh');
$$;

-- 3. Políticas SELECT (somente leitura) para RH

-- profiles
CREATE POLICY "RH view all profiles"
ON public.profiles FOR SELECT
USING (public.is_rh());

-- user_roles
CREATE POLICY "RH view all roles"
ON public.user_roles FOR SELECT
USING (public.is_rh());

-- leads
CREATE POLICY "RH view all leads"
ON public.leads FOR SELECT
USING (public.is_rh());

-- wallet_transactions
CREATE POLICY "RH view all wallet tx"
ON public.wallet_transactions FOR SELECT
USING (public.is_rh());

-- pdvs
CREATE POLICY "RH view all pdvs"
ON public.pdvs FOR SELECT
USING (public.is_rh());

-- pdv_leads
CREATE POLICY "RH view all pdv_leads"
ON public.pdv_leads FOR SELECT
USING (public.is_rh());

-- 4. Saques PIX: RH pode VER e ATUALIZAR status (para processar pagamentos)
CREATE POLICY "RH view all withdrawals"
ON public.wallet_withdrawals FOR SELECT
USING (public.is_rh());

CREATE POLICY "RH update withdrawal status"
ON public.wallet_withdrawals FOR UPDATE
USING (public.is_rh())
WITH CHECK (public.is_rh());
