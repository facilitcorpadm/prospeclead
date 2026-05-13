import { useNavigate, useLocation } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeftRight,
  Check,
  LayoutDashboard,
  User,
  Eye,
  Briefcase,
} from "lucide-react";

type EnvKey = "admin" | "promoter" | "rh" | "visualizador";

const ENV_META: Record<
  EnvKey,
  { label: string; path: string; icon: typeof LayoutDashboard; badge: string }
> = {
  admin: {
    label: "Painel Admin",
    path: "/admin",
    icon: LayoutDashboard,
    badge: "ADMIN",
  },
  promoter: {
    label: "Painel Promoter",
    path: "/",
    icon: User,
    badge: "PROMOTER",
  },
  rh: {
    label: "Painel RH",
    path: "/rh",
    icon: Briefcase,
    badge: "RH",
  },
  visualizador: {
    label: "Painel Visualizador",
    path: "/admin/visualizador",
    icon: Eye,
    badge: "VISUALIZADOR",
  },
};

/**
 * Botão para alternar entre os painéis (ambientes) que o usuário tem acesso.
 *
 * - Só aparece quando o usuário possui mais de um papel.
 * - Detecta automaticamente o ambiente atual pela rota.
 * - Navega para a rota raiz do ambiente escolhido.
 */
export default function EnvironmentSwitcher({
  variant = "default",
}: {
  variant?: "default" | "compact";
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isRh, isVisualizador, loading } = useRole();

  // Promoter é o papel "padrão" — todo usuário autenticado pode acessar /.
  // Mostramos a opção "Promoter" sempre que o usuário tiver QUALQUER outro
  // papel administrativo (assim ele consegue voltar para o app principal).
  const envs: EnvKey[] = [];
  if (isAdmin) envs.push("admin");
  if (isRh) envs.push("rh");
  // Admins também podem abrir o Painel Visualizador (read-only).
  if (isVisualizador || isAdmin) envs.push("visualizador");
  // Sempre permite acessar o painel Promoter quando o usuário tem outro papel.
  if (envs.length > 0) envs.push("promoter");

  if (loading || envs.length < 2) return null;

  // Detecta ambiente atual pela rota.
  let currentEnv: EnvKey = "promoter";
  if (location.pathname.startsWith("/admin/visualizador")) {
    currentEnv = "visualizador";
  } else if (location.pathname.startsWith("/admin")) {
    currentEnv = "admin";
  } else if (location.pathname.startsWith("/rh")) {
    currentEnv = "rh";
  }

  const current = ENV_META[currentEnv];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 font-medium"
          aria-label="Trocar ambiente"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          {variant === "default" && (
            <span className="hidden sm:inline text-xs">
              {current.badge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Trocar ambiente
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {envs.map((env) => {
          const meta = ENV_META[env];
          const Icon = meta.icon;
          const isCurrent = env === currentEnv;
          return (
            <DropdownMenuItem
              key={env}
              onClick={() => {
                if (!isCurrent) navigate(meta.path);
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm">{meta.label}</span>
              {isCurrent && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
