// Edge function para garantir a existência da conta de RH padrão.
// Requer autenticação como admin OU chamada direta com a service-role key.
// Não redefine a senha de contas existentes — apenas cria a conta na primeira vez
// e garante o papel 'rh'. A senha inicial deve ser configurada via secret
// `RH_DEFAULT_PASSWORD` (não há valor de fallback hardcoded).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Conta de RH padrão. A senha NUNCA tem fallback hardcoded — deve ser
// configurada como secret no projeto e idealmente rotacionada após o
// primeiro login.
const RH_EMAIL = Deno.env.get("RH_DEFAULT_EMAIL") ?? "rh@facilitcorp.com";
const RH_PASSWORD = Deno.env.get("RH_DEFAULT_PASSWORD");
const RH_NAME = "RH Facilit Corp";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Autorização: aceita ou bearer da service-role key, ou um JWT de usuário admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();

    let authorized = false;
    if (bearer && bearer === SERVICE_KEY) {
      authorized = true;
    } else if (bearer) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (!userErr && userData?.user) {
        const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
        const { data: roleRow } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) authorized = true;
      }
    }

    if (!authorized) {
      return json({ error: "Forbidden — admins only" }, 403);
    }

    if (!RH_PASSWORD) {
      return json(
        {
          error:
            "Configuração ausente: defina a secret RH_DEFAULT_PASSWORD antes de executar o bootstrap.",
        },
        500,
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Verifica se já existe um usuário com este e-mail
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) {
      return json({ error: listErr.message }, 500);
    }

    let userId = list.users.find(
      (u) => u.email?.toLowerCase() === RH_EMAIL.toLowerCase(),
    )?.id;
    let created = false;

    // 2. Se não existe, cria o usuário já confirmado.
    //    NÃO redefine a senha de contas existentes — isso evitaria que um
    //    invasor com acesso à function pudesse "resetar" a conta para uma
    //    senha conhecida.
    if (!userId) {
      const { data: createdUser, error: createErr } = await admin.auth.admin
        .createUser({
          email: RH_EMAIL,
          password: RH_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: RH_NAME },
        });
      if (createErr || !createdUser.user) {
        return json(
          { error: createErr?.message ?? "Falha ao criar usuário RH" },
          400,
        );
      }
      userId = createdUser.user.id;
      created = true;
    }

    // 3. Garante o papel 'rh' (mantendo o 'promoter' criado pelo trigger)
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "rh" });
    if (roleErr && !`${roleErr.message}`.toLowerCase().includes("duplicate")) {
      console.error("rh role insert error", roleErr);
    }

    return json({ ok: true, user_id: userId, email: RH_EMAIL, created });
  } catch (e) {
    console.error("rh-bootstrap error", e);
    return json({ error: (e as Error).message ?? "Erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
