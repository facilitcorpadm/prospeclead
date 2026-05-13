import { ReactNode } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import {
  Sidebar,
  SidebarContent,
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
  Wallet,
  LogOut,
  HeartHandshake,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { to: "/rh", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/rh/promoters", label: "Promoters", icon: Users },
  { to: "/rh/pagamentos", label: "Pagamentos PIX", icon: Wallet },
];

function RhSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-3 py-4 flex items-center gap-2 border-b">
          <div className="w-8 h-8 rounded-lg bg-success flex items-center justify-center text-success-foreground shrink-0">
            <HeartHandshake className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm leading-none">Painel RH</p>
              <p className="text-[10px] text-muted-foreground">
                Somente leitura + pagamentos
              </p>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Visualização</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={it.to}
                      end={it.end}
                      className={({ isActive }) =>
                        `flex items-center gap-2 ${
                          isActive
                            ? "bg-success/10 text-success font-semibold"
                            : "hover:bg-muted"
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
      </SidebarContent>
    </Sidebar>
  );
}

interface Props {
  children?: ReactNode;
}

export default function RhLayout({ children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { isRh, isAdmin, loading: roleLoading } = useRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-success border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  // Admin também pode ver, mas não promoter sem papel rh
  if (!isRh && !isAdmin) return <Navigate to="/" replace />;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <RhSidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <header className="h-14 md:h-16 bg-background/95 backdrop-blur border-b flex items-center justify-between gap-2 px-3 md:px-5 xl:px-6 sticky top-0 z-30">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
              <Badge
                variant="outline"
                className="bg-success/10 text-success border-success/30 hidden md:flex"
              >
                <Eye className="w-3 h-3 mr-1" /> Somente leitura
              </Badge>
              <div className="flex items-center gap-1.5 md:hidden min-w-0">
                <HeartHandshake className="w-4 h-4 text-success shrink-0" />
                <span className="font-bold text-sm truncate">RH</span>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground hidden lg:block max-w-[220px] truncate">
                {user.email}
              </span>
              <Button onClick={signOut} variant="outline" size="sm" className="px-2 sm:px-3">
                <LogOut className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden bg-muted/20">
            <div className="mx-auto w-full max-w-[1480px] p-3 sm:p-4 md:p-6 xl:p-8">
              {children ?? <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
