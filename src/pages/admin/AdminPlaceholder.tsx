import { useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction } from "lucide-react";

interface Props {
  title: string;
  description?: string;
}

/**
 * Placeholder genérico para páginas do painel Admin que ainda não foram
 * construídas. Mantém a navegação consistente sem redirecionar para 404.
 */
export default function AdminPlaceholder({ title, description }: Props) {
  const location = useLocation();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      <Card className="p-10 rounded-xl border border-dashed border-border bg-card flex flex-col items-center justify-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <Construction className="w-6 h-6 text-muted-foreground" />
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
          Em construção
        </Badge>
        <h2 className="text-lg font-semibold">
          Esta seção será construída em breve
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          A rota{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
            {location.pathname}
          </code>{" "}
          já está reservada no menu. Posso implementar as funcionalidades dessa
          área quando você quiser — basta pedir.
        </p>
      </Card>
    </div>
  );
}
