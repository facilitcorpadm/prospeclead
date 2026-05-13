import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useRole() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isRh, setIsRh] = useState<boolean>(false);
  const [isVisualizador, setIsVisualizador] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        setIsAdmin(false);
        setIsRh(false);
        setIsVisualizador(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
      ]);

      if (cancelled) return;

      if (rolesRes.error) {
        console.warn("useRole: falha ao carregar papéis (user_roles)", rolesRes.error);
      }
      
      const roles = (rolesRes.data ?? []).map((r) => r.role as string);
      
      // Também considera o campo 'role' da tabela profiles (novo padrão)
      if (profileRes.data?.role) {
        roles.push(profileRes.data.role);
      }

      setIsAdmin(roles.includes("admin"));
      setIsRh(roles.includes("rh"));
      setIsVisualizador(roles.includes("visualizador"));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Depende somente do id do usuário — assim TOKEN_REFRESHED (que troca a
    // referência do objeto `user`) não dispara um novo fetch desnecessário.
  }, [userId]);

  return { isAdmin, isRh, isVisualizador, loading };
}
