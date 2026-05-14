import { ReactNode, useState } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useProfile } from "@/hooks/useProfile";
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
  Bell,
  ChevronDown,
  Store,
  Inbox,
  Bot,
  Megaphone,
  Radar,
  ClipboardList,
  Columns3,
  BookOpen,
  Tags,
  UserCog,
  Settings,
  Camera,
  Percent,
  ShieldCheck,
  ListChecks,
  ShoppingCart,
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
import EnvironmentSwitcher from "@/components/EnvironmentSwitcher";
import logo from "@/assets/prospeclead-logo.png";
import { resolveUiRole, getUiRoleMeta } from "@/lib/roleMapping";

/* ---------- Estrutura de navegação por seções ---------- */
const NAV_SECTIONS: {
  label: string;
  items: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }[];
}[] = [
  {
    label: "Visão Geral",
    items: [
      { to: "/admin", label: "Dashboard Global", icon: LayoutDashboard, end: true },
      { to: "/admin/portfolio", label: "Portfólio", icon: BookOpen },    ],
  },
  {
    label: "Omnichannel IA",
    items: [
      { to: "/admin/inbox", label: "Caixa de Entrada", icon: Inbox },
      { to: "/admin/ai-agents", label: "Agentes de IA", icon: Bot },
      { to: "/admin/campaigns", label: "Motor de Campanhas", icon: Megaphone },
      { to: "/admin/radar-b2b", label: "Radar B2B", icon: Radar },
      { to: "/admin/config/whatsapp", label: "Configuração WhatsApp", icon: ShieldCheck },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/admin/tarefas", label: "Tarefas & Agenda", icon: ClipboardList },
      { to: "/admin/kanban", label: "Kanban — Funil", icon: Columns3 },
    ],
  },
  {
    label: "Administração",
    items: [
      { to: "/admin/catalogo", label: "Catálogo e Comissões", icon: BookOpen },
      { to: "/admin/marcas", label: "Gestão de Marcas", icon: Tags },
      { to: "/admin/promoters", label: "Promotores", icon: Users },
      { to: "/admin/usuarios", label: "Usuários", icon: UserCog },
      { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { to: "/admin/auditoria-fotos", label: "Auditoria de Fotos", icon: Camera },
      { to: "/admin/comissoes-kyc", label: "Comissões & KYC", icon: Percent },
      { to: "/admin/revisao-kyc", label: "Revisão KYC", icon: ShieldCheck },
      { to: "/admin/saques", label: "Saques PIX", icon: Wallet },
    ],
  },
  {
    label: "Rede PDV",
    items: [
      { to: "/admin/leads", label: "Leads", icon: ContactRound },
      { to: "/admin/leads-pdv", label: "Leads PDV", icon: ContactRound },
      { to: "/admin/venda-rapida", label: "Venda Rápida (PDV)", icon: ShoppingCart },
      { to: "/admin/fila-oportunidades", label: "Fila de Oportunidades", icon: ListChecks },
      { to: "/admin/pdvs", label: "Pontos de Venda", icon: Store },
    ],
  },
];

/* Mapeia path → título exibido no header */
const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard Global",
  "/admin/inbox": "Caixa de Entrada",
  "/admin/ai-agents": "Agentes de IA",
  "/admin/campaigns": "Motor de Campanhas",
  "/admin/radar-b2b": "Radar B2B",
  "/admin/tarefas": "Tarefas & Agenda",
  "/admin/kanban": "Kanban — Funil",
  "/admin/catalogo": "Catálogo e Comissões",
  "/admin/marcas": "Gestão de Marcas",
  "/admin/promoters": "Promotores",
  "/admin/usuarios": "Usuários",
  "/admin/configuracoes": "Configurações",
  "/admin/auditoria-fotos": "Auditoria de Fotos",
  "/admin/comissoes-kyc": "Comissões & KYC",
  "/admin/revisao-kyc": "Revisão KYC",
  "/admin/saques": "Saques PIX",
  "/admin/leads-pdv": "Leads PDV",
  "/admin/venda-rapida": "Venda Rápida (PDV)",
  "/admin/fila-oportunidades": "Fila de Oportunidades",
  "/admin/pdvs": "Pontos de Venda",
  "/admin/leads": "Leads",
  "/admin/ranking": "Ranking",
  "/admin/config/whatsapp": "Configurações WhatsApp",
  "/admin/portfolio": "Portfólio",
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
  // Capitaliza primeira letra de cada palavra para casar com o print
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ---------- Sidebar ---------- */
function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isAdmin, isRh } = useRole();

  const uiRole = resolveUiRole({ isAdmin, isRh });
  const roleMeta = getUiRoleMeta(uiRole);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar">
        {/* Logo */}
        <div className="px-3 py-4 flex items-center gap-2 border-b border-sidebar-border">
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0 font-bold text-sm">
              P
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
                  Painel Admin
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Card de usuário */}
        {!collapsed && (
          <div className="mx-3 mt-3 mb-2 p-3 rounded-lg border border-sidebar-border bg-card">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
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
              className={`mt-2 h-5 px-2 text-[10px] font-bold ${roleMeta.badgeClass}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
              {roleMeta.label}
            </Badge>
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
                              ? "bg-foreground/10 text-foreground font-semibold border-l-2 border-foreground"
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
function AdminHeader() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isAdmin, isRh } = useRole();
  const location = useLocation();
  const [hasNewNotif] = useState(true);

  const uiRole = resolveUiRole({ isAdmin, isRh });
  const roleMeta = getUiRoleMeta(uiRole);
  const title = PAGE_TITLES[location.pathname] ?? "Painel Admin";

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between gap-3 px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger />
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold leading-tight truncate">
            {title}
          </h1>
          <p className="text-[11px] text-muted-foreground capitalize hidden sm:block">
            {todayLong()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Trocar ambiente (aparece se o usuário tiver mais de um papel) */}
        <EnvironmentSwitcher />

        {/* Sino */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label="Notificações"
        >
          <Bell className="w-4 h-4" />
          {hasNewNotif && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-foreground ring-2 ring-background" />
          )}
        </Button>

        {/* Dropdown usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-foreground/10 text-foreground text-[10px] font-bold">
                  {getInitials(profile?.full_name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left leading-tight">
                <p className="text-xs font-semibold">
                  {profile?.full_name?.split(" ")[0] || "Admin"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {roleMeta.label}
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
                  className={`mt-1.5 h-5 px-1.5 text-[10px] font-bold w-fit ${roleMeta.badgeClass}`}
                >
                  {roleMeta.label}
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

export default function AdminLayout({ children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <AdminHeader />
          <main className="flex-1 overflow-x-hidden bg-muted/30">
            <div className="mx-auto w-full max-w-[1480px] p-4 md:p-6 xl:p-8">
              {children ?? <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
