CREATE OR REPLACE FUNCTION public.promoters_ranking(_month_start timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(
  id uuid,
  full_name text,
  leads bigint,
  earnings numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    COALESCE(p.full_name, 'Promoter') AS full_name,
    COALESCE(l.leads_count, 0) AS leads,
    COALESCE(t.earnings_total, 0) AS earnings
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'promoter'
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS leads_count
    FROM public.leads
    WHERE created_at >= _month_start
    GROUP BY user_id
  ) l ON l.user_id = p.id
  LEFT JOIN (
    SELECT user_id, SUM(amount) AS earnings_total
    FROM public.wallet_transactions
    WHERE created_at >= _month_start
      AND amount > 0
      AND kind IN ('credit','bonus','adjustment')
    GROUP BY user_id
  ) t ON t.user_id = p.id
  ORDER BY leads DESC, earnings DESC, full_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.promoters_ranking(timestamptz) TO authenticated;