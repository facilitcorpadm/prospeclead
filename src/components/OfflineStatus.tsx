import { useSync } from "@/hooks/useSync";
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Banner discreto fixado no rodapé acima da BottomNav.
 *
 * Estados visuais:
 *  - offline + pendentes  → vermelho ("Offline · N pendente(s)")
 *  - offline sem pendência → cinza-escuro ("Você está offline")
 *  - syncing               → azul ("Sincronizando…")
 *  - erro de sync          → âmbar ("Falha ao sincronizar — tentaremos novamente")
 *  - online + N pendentes  → âmbar ("N lead(s) aguardando envio")
 *  - online + sem pend.    → não renderiza (não polui a tela)
 */
export default function OfflineStatus() {
  const { offline, pendingCount, syncState, lastError, syncNow } = useSync();

  // Caso "tudo certo": não renderiza nada.
  if (!offline && pendingCount === 0 && syncState !== "syncing" && syncState !== "error") {
    return null;
  }

  let label = "";
  let Icon = Cloud;
  let tone = "bg-muted text-foreground border-border";

  if (offline) {
    Icon = CloudOff;
    if (pendingCount > 0) {
      label = `Offline · ${pendingCount} lead${pendingCount > 1 ? "s" : ""} pendente${pendingCount > 1 ? "s" : ""}`;
      tone = "bg-destructive text-destructive-foreground border-destructive/40";
    } else {
      label = "Você está offline";
      tone = "bg-foreground/85 text-background border-foreground/40";
    }
  } else if (syncState === "syncing") {
    Icon = RefreshCw;
    label = pendingCount > 0
      ? `Sincronizando… ${pendingCount} pendente${pendingCount > 1 ? "s" : ""}`
      : "Sincronizando…";
    tone = "bg-[hsl(var(--brand-blue,210_85%_45%))] text-white border-white/20";
  } else if (syncState === "error") {
    Icon = AlertTriangle;
    label = lastError
      ? `Falha ao sincronizar — tentaremos novamente`
      : "Falha ao sincronizar";
    tone = "bg-warning text-warning-foreground border-warning/40";
  } else if (pendingCount > 0) {
    Icon = Cloud;
    label = `${pendingCount} lead${pendingCount > 1 ? "s" : ""} aguardando envio`;
    tone = "bg-warning text-warning-foreground border-warning/40";
  }

  // Posiciona acima da bottom nav (h-16 = 4rem) com pequena margem.
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 px-3 pointer-events-none",
        "bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-3",
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-md flex items-center gap-2 rounded-full border px-3 py-2 shadow-lg backdrop-blur-sm pointer-events-auto",
          tone,
        )}
      >
        <Icon
          className={cn("w-4 h-4 shrink-0", syncState === "syncing" && "animate-spin")}
        />
        <span className="text-xs font-semibold flex-1 truncate">{label}</span>
        {!offline && pendingCount > 0 && syncState !== "syncing" && (
          <button
            type="button"
            onClick={() => syncNow().catch(() => {})}
            className="text-[11px] font-bold underline underline-offset-2 hover:opacity-90"
          >
            Tentar agora
          </button>
        )}
      </div>
    </div>
  );
}
