
-- Enums
CREATE TYPE public.lead_kind AS ENUM ('b2c', 'b2b');
CREATE TYPE public.lead_status AS ENUM ('coletado','contatado','respondido','vendido','prospectado','negociando','fechado');
CREATE TYPE public.visit_status AS ENUM ('pendente','em_andamento','concluida');
CREATE TYPE public.user_level AS ENUM ('BRONZE','PRATA','OURO');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  daily_goal INT NOT NULL DEFAULT 100,
  level public.user_level NOT NULL DEFAULT 'BRONZE',
  monthly_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  streak_days INT NOT NULL DEFAULT 0,
  current_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.lead_kind NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  vehicle_model TEXT,
  vehicle_plate TEXT,
  company_cnpj TEXT,
  fleet_size INT,
  city TEXT,
  value NUMERIC(12,2),
  status public.lead_status NOT NULL DEFAULT 'coletado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own leads select" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own leads insert" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own leads update" ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own leads delete" ON public.leads FOR DELETE USING (auth.uid() = user_id);

-- Checkins
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own checkins select" ON public.checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own checkins insert" ON public.checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own checkins update" ON public.checkins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own checkins delete" ON public.checkins FOR DELETE USING (auth.uid() = user_id);

-- Visits
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_name TEXT NOT NULL,
  address TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status public.visit_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own visits select" ON public.visits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own visits insert" ON public.visits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own visits update" ON public.visits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own visits delete" ON public.visits FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- New user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
