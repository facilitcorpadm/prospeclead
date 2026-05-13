
-- 1) wallet_balance: enforce caller check
CREATE OR REPLACE FUNCTION public.wallet_balance(_user_id uuid)
 RETURNS TABLE(available numeric, pending numeric, withdrawn numeric, total_earned numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_id <> auth.uid()
     AND NOT public.is_admin()
     AND NOT public.is_rh()
     AND NOT public.is_visualizador() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0) AS available,
    COALESCE((SELECT SUM(amount) FROM public.wallet_withdrawals
              WHERE user_id = _user_id AND status IN ('pendente','aprovado')), 0) AS pending,
    COALESCE((SELECT SUM(amount) FROM public.wallet_withdrawals
              WHERE user_id = _user_id AND status = 'pago'), 0) AS withdrawn,
    COALESCE(SUM(amount) FILTER (WHERE amount > 0 AND kind IN ('credit','bonus','adjustment')), 0) AS total_earned
  FROM public.wallet_transactions
  WHERE user_id = _user_id;
END;
$function$;

-- 2) pdvs: drop public broad SELECT and replace with minimal-fields SECURITY DEFINER lookup
DROP POLICY IF EXISTS "Public read active pdv by code" ON public.pdvs;

CREATE OR REPLACE FUNCTION public.get_pdv_public(_short_code text)
 RETURNS TABLE(id uuid, name text, city text, state text, active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, name, city, state, active
  FROM public.pdvs
  WHERE short_code = upper(_short_code)
    AND active = true
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_pdv_public(text) TO anon, authenticated;

-- 3) app_settings: restrict sensitive credentials to admins; expose only branding fields to authenticated users
DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.app_settings;

CREATE POLICY "Admins read settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (is_admin());

CREATE OR REPLACE FUNCTION public.get_branding_settings()
 RETURNS TABLE(
   brand_name text,
   brand_logo_url text,
   primary_color text,
   brand_cnpj text,
   contact_email text,
   contact_phone text,
   contact_responsible text,
   contact_city text,
   contact_state text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT brand_name, brand_logo_url, primary_color, brand_cnpj,
         contact_email, contact_phone, contact_responsible,
         contact_city, contact_state
  FROM public.app_settings
  WHERE id = 1
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_branding_settings() TO authenticated, anon;

-- 4) Rate limiting for capture_pdv_lead (per IP)
CREATE TABLE IF NOT EXISTS public.pdv_capture_rate_limit (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdv_capture_rate_limit_ip_time
  ON public.pdv_capture_rate_limit (ip, created_at DESC);

ALTER TABLE public.pdv_capture_rate_limit ENABLE ROW LEVEL SECURITY;

-- No client policies (only definer functions touch this table)
CREATE POLICY "Admins read rate limit"
ON public.pdv_capture_rate_limit
FOR SELECT
TO authenticated
USING (is_admin());

CREATE OR REPLACE FUNCTION public.capture_pdv_lead(_short_code text, _contact_name text, _contact_phone text DEFAULT NULL::text, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _pdv RECORD;
  _new_lead_id UUID;
  _ip TEXT;
  _recent_count INT;
BEGIN
  IF _contact_name IS NULL OR length(trim(_contact_name)) = 0 THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;

  IF length(_contact_name) > 200 THEN
    RAISE EXCEPTION 'Nome muito longo';
  END IF;

  IF _contact_phone IS NOT NULL AND length(_contact_phone) > 30 THEN
    RAISE EXCEPTION 'Telefone inválido';
  END IF;

  IF _note IS NOT NULL AND length(_note) > 500 THEN
    RAISE EXCEPTION 'Observação muito longa';
  END IF;

  -- Best-effort IP from PostgREST request headers
  BEGIN
    _ip := COALESCE(
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      current_setting('request.headers', true)::json->>'cf-connecting-ip',
      'unknown'
    );
    -- x-forwarded-for can be a list; take the first
    _ip := split_part(_ip, ',', 1);
    _ip := trim(_ip);
  EXCEPTION WHEN OTHERS THEN
    _ip := 'unknown';
  END;

  -- Rate limit: max 5 captures per IP per minute
  IF _ip <> 'unknown' THEN
    SELECT COUNT(*) INTO _recent_count
    FROM public.pdv_capture_rate_limit
    WHERE ip = _ip AND created_at > now() - interval '1 minute';

    IF _recent_count >= 5 THEN
      RAISE EXCEPTION 'Muitas tentativas. Aguarde alguns instantes.';
    END IF;

    INSERT INTO public.pdv_capture_rate_limit (ip) VALUES (_ip);

    -- Cleanup old rows opportunistically
    DELETE FROM public.pdv_capture_rate_limit
    WHERE created_at < now() - interval '1 hour';
  END IF;

  SELECT * INTO _pdv FROM public.pdvs WHERE short_code = _short_code AND active = true;
  IF _pdv IS NULL THEN
    RAISE EXCEPTION 'PDV não encontrado ou inativo';
  END IF;

  INSERT INTO public.leads (user_id, kind, name, phone, status, city, captured_at)
  VALUES (_pdv.user_id, 'b2c', _contact_name, _contact_phone, 'coletado', _pdv.city, now())
  RETURNING id INTO _new_lead_id;

  INSERT INTO public.pdv_leads (pdv_id, user_id, lead_id, contact_name, contact_phone, note, reward_amount, ip)
  VALUES (_pdv.id, _pdv.user_id, _new_lead_id, _contact_name, _contact_phone, _note, _pdv.reward_per_lead, _ip);

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
$function$;
