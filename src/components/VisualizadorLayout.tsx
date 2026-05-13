import { ReactNode } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useProfile } from "@/hooks/useProfile";
import { ReadOnlyProvider } from "@/hooks/useReadOnly";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  ContactRound,
  Wallet,
  LogOut,
  Trophy,
  Eye,
  ChevronDown,
  ShieldCheck,
  Inbox,
  Bot,
  Megaphone,
  Radar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/prospeclead-logo.png";

/* ---------- Itens de navegação (somente leitura) ---------- */
const NAV_SECTIONS: {
  label: string;
  items: {
    to: string;
    label: string;
    icon: typeof LayoutDashboard;
    end?: boolean;
  }[];
}[] = [
  {
    label: "Visão Geral",
    items: [
      {
        to: "/admin/visualizador",
        label: "Dashboard",
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    label: "Omnichannel IA",
    items: [
      { to: "/admin/visualizador/inbox", label: "Caixa de Entrada", icon: Inbox },
      { to: "/admin/visualizador/ai-agents", label: "Agentes de IA", icon: Bot },
      { to: "/admin/visualizador/campaigns", label: "Motor de Campanhas", icon: Megaphone },
      { to: "/admin/visualizador/radar-b2b", label: "Radar B2B", icon: Radar },
    ],
  },
  {
    label: "Consulta",
    items: [
      { to: "/admin/visualizador/leads", label: "Leads", icon: ContactRound },
      { to: "/admin/visualizador/promoters", label: "Promotores", icon: Users },
      { to: "/admin/visualizador/saques", label: "Saques", icon: Wallet },
      { to: "/admin/visualizador/ranking", label: "Ranking", icon: Trophy },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin/visualizador": "Dashboard",
  "/admin/visualizador/inbox": "Caixa de Entrada",
  "/admin/visualizador/ai-agents": "Agentes de IA",
  "/admin/visualizador/campaigns": "Motor de Campanhas",
  "/admin/visualizador/radar-b2b": "Radar B2B",
  "/admin/visualizador/leads": "Leads",
  "/admin/visualizador/promoters": "Promotores",
  "/admin/visualizador/saques": "Saques",
  "/admin/visualizador/ranking": "Ranking",
};

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function todayLong() {
  const s = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ---------- Sidebar ---------- */
function VisualizadorSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useAuth();
  const { profile } = useProfile();

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar">
        {/* Logo */}
        <div className="px-3 py-4 flex items-center gap-2 border-b border-sidebar-border">
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shrink-0 font-bold text-sm">
              V
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="ProspecLead"
                className="h-7 w-auto object-contain"
              />
              <div className="leading-none">
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Visualizador
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Card de usuário com badge VISUALIZADOR */}
        {!collapsed && (
          <div className="mx-3 mt-3 mb-2 p-3 rounded-lg border border-sidebar-border bg-card">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                  {getInitials(profile?.full_name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight truncate">
                  {profile?.full_name || "Usuário"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="mt-2 h-5 px-2 text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40"
            >
              <Eye className="w-3 h-3 mr-1" />
              VISUALIZADOR
            </Badge>
            <p className="mt-1.5 text-[10px] text-muted-foreground leading-snug">
              Acesso somente leitura. Edição e exclusão estão desabilitadas.
            </p>
          </div>
        )}

        {/* Seções de navegação */}
        {NAV_SECTIONS.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((it) => (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={it.to}
                        end={it.end}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 ${
                            isActive
                              ? "bg-foreground/10 text-foreground font-semibold border-l-2 border-amber-500"
                              : "hover:bg-muted text-foreground/80"
                          }`
                        }
                      >
                        <it.icon className="w-4 h-4" />
                        {!collapsed && <span>{it.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 bg-sidebar">
        <Button
          onClick={signOut}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sair do Sistema</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

/* ---------- Header ---------- */
function VisualizadorHeader() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? "Painel Visualizador";

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between gap-3 px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger />
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold leading-tight truncate flex items-center gap-2">
            {title}
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40"
            >
              <Eye className="w-3 h-3 mr-1" />
              SOMENTE LEITURA
            </Badge>
          </h1>
          <p className="text-[11px] text-muted-foreground capitalize hidden sm:block">
            {todayLong()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                  {getInitials(profile?.full_name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left leading-tight">
                <p className="text-xs font-semibold">
                  {profile?.full_name?.split(" ")[0] || "Visualizador"}
                </p>
                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                  VISUALIZADOR
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">
                  {profile?.full_name || "Usuário"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </span>
                <Badge
                  variant="outline"
                  className="mt-1.5 h-5 px-1.5 text-[10px] font-bold w-fit bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40"
                >
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  VISUALIZADOR
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair do Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/* ---------- Layout principal ---------- */
interface Props {
  children?: ReactNode;
}

export default function VisualizadorLayout({ children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isVisualizador, loading: roleLoading } = useRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  // Admin também pode acessar (preview); Visualizador é o público alvo
  if (!isAdmin && !isVisualizador) return <Navigate to="/" replace />;

  return (
    <ReadOnlyProvider value={true}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-muted/30">
          <VisualizadorSidebar />
          <div className="flex-1 flex flex-col min-w-0 bg-background">
            <VisualizadorHeader />
            <main className="flex-1 overflow-x-hidden bg-muted/30">
              <div className="mx-auto w-full max-w-[1480px] p-4 md:p-6 xl:p-8">
                {children ?? <Outlet />}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ReadOnlyProvider>
  );
}
