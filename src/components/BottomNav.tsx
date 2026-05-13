import { NavLink } from "react-router-dom";
import { Home, ContactRound, Calendar, Flag, Users, User } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function BottomNav() {
  const { user } = useAuth();
  const [leadsCount, setLeadsCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setLeadsCount(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (!cancelled) setLeadsCount(count ?? 0);
    };
    load();

    const channel = supabase
      .channel("bottomnav-leads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const items = [
    { to: "/", label: "Início", icon: Home, end: true, badge: 0 },
    { to: "/leads", label: "Leads", icon: ContactRound, badge: leadsCount },
    { to: "/agenda", label: "Agenda", icon: Calendar, badge: 0 },
    { to: "/missoes", label: "Missões", icon: Flag, badge: 0 },
    { to: "/equipe", label: "Equipe", icon: Users, badge: 0 },
    { to: "/perfil", label: "Perfil", icon: User, badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background border-t border-border z-40">
      <ul className="grid grid-cols-6">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <div className="relative">
                <it.icon className="w-5 h-5" />
                {it.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {it.badge > 99 ? "99+" : it.badge}
                  </span>
                )}
              </div>
              <span>{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
