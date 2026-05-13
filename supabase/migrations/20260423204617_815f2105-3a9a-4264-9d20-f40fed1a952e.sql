-- Função auxiliar
CREATE OR REPLACE FUNCTION public.is_visualizador()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'visualizador');
$$;

-- Policies de leitura (SELECT) para visualizador
CREATE POLICY "Visualizador view all leads" ON public.leads
  FOR SELECT USING (public.is_visualizador());

CREATE POLICY "Visualizador view all profiles" ON public.profiles
  FOR SELECT USING (public.is_visualizador());

CREATE POLICY "Visualizador view all roles" ON public.user_roles
  FOR SELECT USING (public.is_visualizador());

CREATE POLICY "Visualizador view all withdrawals" ON public.wallet_withdrawals
  FOR SELECT USING (public.is_visualizador());

CREATE POLICY "Visualizador view all wallet tx" ON public.wallet_transactions
  FOR SELECT USING (public.is_visualizador());

CREATE POLICY "Visualizador view all pdvs" ON public.pdvs
  FOR SELECT USING (public.is_visualizador());

CREATE POLICY "Visualizador view all pdv_leads" ON public.pdv_leads
  FOR SELECT USING (public.is_visualizador());

CREATE POLICY "Visualizador view all payslips" ON public.payslips
  FOR SELECT USING (public.is_visualizador());

CREATE POLICY "Visualizador view all checkins" ON public.checkins
  FOR SELECT USING (public.is_visualizador());

CREATE POLICY "Visualizador view all visits" ON public.visits
  FOR SELECT USING (public.is_visualizador());