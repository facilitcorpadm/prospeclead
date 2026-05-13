-- =====================================================
-- ADMIN SYSTEM — user_roles + RLS expansion
-- =====================================================

-- 1. Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'promoter');

-- 2. Tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função has_role (security definer, evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 4. Atalho is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- 5. RLS user_roles
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Auto-atribuir 'promoter' a novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'promoter')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Atribui papel 'promoter' a usuários já existentes
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'promoter' FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- 7. Expandir RLS para admin em todas as tabelas
-- =====================================================

-- PROFILES
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE USING (public.is_admin());
CREATE POLICY "Admins insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.is_admin());

-- LEADS
CREATE POLICY "Admins view all leads" ON public.leads
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins update all leads" ON public.leads
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins delete all leads" ON public.leads
  FOR DELETE USING (public.is_admin());
CREATE POLICY "Admins insert leads" ON public.leads
  FOR INSERT WITH CHECK (public.is_admin());

-- CHECKINS
CREATE POLICY "Admins manage all checkins" ON public.checkins
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- VISITS
CREATE POLICY "Admins manage all visits" ON public.visits
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- WALLET TRANSACTIONS
CREATE POLICY "Admins view all tx" ON public.wallet_transactions
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins insert any tx" ON public.wallet_transactions
  FOR INSERT WITH CHECK (public.is_admin());

-- WALLET WITHDRAWALS
CREATE POLICY "Admins view all withdrawals" ON public.wallet_withdrawals
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins update all withdrawals" ON public.wallet_withdrawals
  FOR UPDATE USING (public.is_admin());
