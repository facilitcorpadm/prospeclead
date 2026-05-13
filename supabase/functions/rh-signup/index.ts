// Edge function pública para cadastro de novos usuários de RH via token secreto.
// Usa SERVICE_ROLE para criar o usuário (já confirmado) e atribuir o papel 'rh'.
// O token é validado server-side e nunca exposto ao cliente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Mesmo token do cadastro de admin (solicitado pelo cliente).
// Pode ser sobrescrito por secret RH_SIGNUP_TOKEN ou ADMIN_SIGNUP_TOKEN.
const RH_TOKEN =
  Deno.env.get("RH_SIGNUP_TOKEN") ??
  Deno.env.get("ADMIN_SIGNUP_TOKEN") ??
  "018810";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, full_name, token } = body as {
      email?: string;
      password?: string;
      full_name?: string;
      token?: string;
    };

    if (!email || !password || !token) {
      return json({ error: "email, password e token são obrigatórios" }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Senha deve ter ao menos 6 caracteres" }, 400);
    }
    if (token.trim() !== RH_TOKEN) {
      return json({ error: "Token de RH inválido" }, 403);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Cria o usuário já confirmado.
    const { data: created, error: createErr } = await admin.auth.admin
      .createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name ?? "" },
      });
    if (createErr || !created.user) {
      return json(
        { error: createErr?.message ?? "Falha ao criar usuário" },
        400,
      );
    }

    const newId = created.user.id;

    // Garante o papel 'rh' (o trigger já cria 'promoter').
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: newId, role: "rh" });
    if (roleErr && !`${roleErr.message}`.toLowerCase().includes("duplicate")) {
      console.error("rh role insert error", roleErr);
    }

    return json({ ok: true, user_id: newId });
  } catch (e) {
    console.error("rh-signup error", e);
    return json({ error: (e as Error).message ?? "Erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
