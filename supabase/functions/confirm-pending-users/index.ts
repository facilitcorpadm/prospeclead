// Confirma manualmente usuários pendentes (sem email confirmado).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { emails } = (await req.json().catch(() => ({}))) as {
      emails?: string[];
    };
    if (!emails || emails.length === 0) {
      return json({ error: "emails é obrigatório" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) return json({ error: listErr.message }, 500);

    const results: Array<{ email: string; ok: boolean; msg?: string }> = [];
    for (const email of emails) {
      const u = list.users.find(
        (x) => x.email?.toLowerCase() === email.toLowerCase(),
      );
      if (!u) {
        results.push({ email, ok: false, msg: "não encontrado" });
        continue;
      }
      if (u.email_confirmed_at) {
        results.push({ email, ok: true, msg: "já confirmado" });
        continue;
      }
      const { error } = await admin.auth.admin.updateUserById(u.id, {
        email_confirm: true,
      });
      results.push({ email, ok: !error, msg: error?.message });
    }

    return json({ ok: true, results });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
