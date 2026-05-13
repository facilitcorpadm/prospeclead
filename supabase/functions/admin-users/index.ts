// Edge function para o painel ADM gerenciar promoters/admins.
// Ações: list, create, update_password, set_role, delete.
// Validações: somente usuários com papel 'admin' podem invocar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type Action =
  | { type: "list" }
  | {
      type: "create";
      email: string;
      password: string;
      full_name?: string;
      phone?: string;
      tenant?: string;
      role?: "admin" | "promoter" | "rh";
    }
  | { type: "update_password"; user_id: string; password: string }
  | {
      type: "update";
      user_id: string;
      full_name?: string;
      phone?: string;
      tenant?: string;
      role?: "admin" | "promoter" | "rh";
      banned?: boolean;
    }
  | { type: "set_role"; user_id: string; role: "admin" | "promoter" | "rh" }
  | { type: "delete"; user_id: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    // 1) Valida o usuário chamador
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Invalid session" }, 401);
    }
    const callerId = userData.user.id;

    // 2) Verifica se o chamador é admin
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRows, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr || !roleRows) {
      return json({ error: "Forbidden — admins only" }, 403);
    }

    const action = (await req.json()) as Action;

    switch (action.type) {
      case "list": {
        const { data: users, error } = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (error) throw error;
        const ids = users.users.map((u) => u.id);
        const [{ data: roles }, { data: profiles }] = await Promise.all([
          admin.from("user_roles").select("user_id, role").in("user_id", ids),
          admin
            .from("profiles")
            .select(
              "id, full_name, level, monthly_earnings, streak_days, daily_goal, current_location",
            )
            .in("id", ids),
        ]);
        const merged = users.users.map((u) => {
          const userRoles = (roles ?? [])
            .filter((r) => r.user_id === u.id)
            .map((r) => r.role);
          const profile = (profiles ?? []).find((p) => p.id === u.id);
          return {
            id: u.id,
            email: u.email,
            phone: (u.user_metadata as any)?.phone ?? null,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            banned_until: (u as any).banned_until ?? null,
            roles: userRoles,
            is_admin: userRoles.includes("admin"),
            is_rh: userRoles.includes("rh"),
            profile,
          };
        });
        return json({ users: merged });
      }

      case "create": {
        if (!action.email || !action.password) {
          return json({ error: "email e password obrigatórios" }, 400);
        }
        const { data: created, error } = await admin.auth.admin.createUser({
          email: action.email,
          password: action.password,
          email_confirm: true,
          user_metadata: {
            full_name: action.full_name ?? "",
            phone: action.phone ?? "",
          },
        });
        if (error) throw error;
        const newId = created.user.id;
        // Profile e role 'promoter' são criados pelos triggers.
        if (action.tenant) {
          await admin
            .from("profiles")
            .update({ current_location: action.tenant })
            .eq("id", newId);
        }
        if (action.role && action.role !== "promoter") {
          await admin
            .from("user_roles")
            .insert({ user_id: newId, role: action.role });
        }
        return json({ user: created.user });
      }

      case "update": {
        const updates: Record<string, unknown> = {};
        if (action.full_name !== undefined) updates.full_name = action.full_name;
        if (action.tenant !== undefined) updates.current_location = action.tenant;
        if (Object.keys(updates).length > 0) {
          await admin.from("profiles").update(updates).eq("id", action.user_id);
        }
        if (action.phone !== undefined) {
          await admin.auth.admin.updateUserById(action.user_id, {
            user_metadata: { phone: action.phone },
          });
        }
        if (action.banned !== undefined) {
          await admin.auth.admin.updateUserById(action.user_id, {
            ban_duration: action.banned ? "876000h" : "none",
          });
        }
        if (action.role) {
          // remove papéis privilegiados existentes (admin/rh) e aplica o novo
          await admin
            .from("user_roles")
            .delete()
            .eq("user_id", action.user_id)
            .in("role", ["admin", "rh"]);
          if (action.role !== "promoter") {
            await admin
              .from("user_roles")
              .insert({ user_id: action.user_id, role: action.role });
          }
        }
        return json({ ok: true });
      }

      case "update_password": {
        const { error } = await admin.auth.admin.updateUserById(
          action.user_id,
          { password: action.password },
        );
        if (error) throw error;
        return json({ ok: true });
      }

      case "set_role": {
        await admin
          .from("user_roles")
          .delete()
          .eq("user_id", action.user_id)
          .in("role", ["admin", "rh"]);
        if (action.role !== "promoter") {
          await admin
            .from("user_roles")
            .insert({ user_id: action.user_id, role: action.role });
        }
        return json({ ok: true });
      }

      case "delete": {
        if (action.user_id === callerId) {
          return json({ error: "Você não pode excluir a si mesmo" }, 400);
        }
        const { error } = await admin.auth.admin.deleteUser(action.user_id);
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ error: "ação desconhecida" }, 400);
    }
  } catch (e) {
    console.error("admin-users error", e);
    return json({ error: (e as Error).message ?? "Erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
