/**
 * Mapeamento entre papéis do banco (app_role: admin | promoter | rh | visualizador)
 * e os papéis de UI mais granulares herdados do projeto Next.js antigo.
 *
 * Esta camada existe APENAS para apresentação. Qualquer mudança real de
 * permissão deve ser feita via migração no enum `app_role`.
 */

export type DbRole = "admin" | "promoter" | "rh" | "visualizador";

export type UiRole =
  | "ADMIN_MASTER"
  | "MANAGER"
  | "FINANCIAL"
  | "VIEWER"
  | "PROMOTER";

interface UiRoleMeta {
  label: UiRole | "VISUALIZADOR";
  /** Texto curto descritivo para tooltip ou subtítulo. */
  description: string;
  /** Classe Tailwind sugerida para badge (usa tokens semânticos). */
  badgeClass: string;
}

const UI_ROLE_META: Record<UiRole, UiRoleMeta> = {
  ADMIN_MASTER: {
    label: "ADMIN_MASTER",
    description: "Administração total",
    badgeClass: "bg-primary/10 text-primary border-primary/30",
  },
  MANAGER: {
    label: "MANAGER",
    description: "Gestão operacional",
    badgeClass: "bg-accent/10 text-accent-foreground border-accent/30",
  },
  FINANCIAL: {
    label: "FINANCIAL",
    description: "Financeiro / RH",
    badgeClass: "bg-success/10 text-success border-success/30",
  },
  VIEWER: {
    label: "VISUALIZADOR",
    description: "Acesso somente leitura",
    badgeClass:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40",
  },
  PROMOTER: {
    label: "PROMOTER",
    description: "Promoter de campo",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

/**
 * Converte um papel do banco no papel de UI "padrão" mais alto.
 */
export function dbRoleToUiRole(role: DbRole): UiRole {
  switch (role) {
    case "admin":
      return "ADMIN_MASTER";
    case "rh":
      return "FINANCIAL";
    case "visualizador":
      return "VIEWER";
    case "promoter":
    default:
      return "PROMOTER";
  }
}

/**
 * Resolve o papel de UI a partir das flags carregadas pelo hook `useRole`.
 * Prioridade: admin > rh > visualizador > promoter.
 */
export function resolveUiRole(opts: {
  isAdmin: boolean;
  isRh: boolean;
  isVisualizador?: boolean;
}): UiRole {
  if (opts.isAdmin) return "ADMIN_MASTER";
  if (opts.isRh) return "FINANCIAL";
  if (opts.isVisualizador) return "VIEWER";
  return "PROMOTER";
}

export function getUiRoleMeta(role: UiRole): UiRoleMeta {
  return UI_ROLE_META[role];
}
