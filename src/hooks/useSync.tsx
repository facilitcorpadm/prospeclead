import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { supabase } from "@/integrations/supabase/client";
import { offlineDb, type PendingLead } from "@/lib/offlineDb";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { toast } from "sonner";

export type SyncState = "idle" | "syncing" | "error";

interface SyncCtx {
  /** Quantos leads pendentes existem no IndexedDB para o usuário atual. */
  pendingCount: number;
  /** True quando o navegador reporta offline. */
  offline: boolean;
  /** Estado da última tentativa de sincronização. */
  syncState: SyncState;
  /** Última mensagem de erro (se houver). */
  lastError: string | null;
  /** Dispara uma sincronização manual. */
  syncNow: () => Promise<void>;
}

const Ctx = createContext<SyncCtx>({
  pendingCount: 0,
  offline: false,
  syncState: "idle",
  lastError: null,
  syncNow: async () => {},
});

/**
 * Provider que monitora a conexão e tenta automaticamente reenviar os leads
 * salvos no IndexedDB sempre que voltar a ficar online (ou ao montar com
 * conexão disponível).
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const offline = useOfflineStatus();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const pendingCount =
    useLiveQuery(
      async () => {
        if (!user) return 0;
        return offlineDb.pendingLeads.where("user_id").equals(user.id).count();
      },
      [user?.id],
      0,
    ) ?? 0;

  const syncOne = useCallback(async (item: PendingLead): Promise<void> => {
    let photoUrl: string | null = null;

    // 1) Upload da foto, se houver.
    if (item.photoBlob && item.photoPath) {
      const { error: upErr } = await supabase.storage
        .from("lead-photos")
        .upload(item.photoPath, item.photoBlob, {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (upErr) {
        // Se o erro for "duplicate" ignoramos (idempotência); outros propagam.
        const msg = (upErr as Error).message ?? "";
        if (!/duplicate|exists/i.test(msg)) {
          throw upErr;
        }
      }
      photoUrl = item.photoPath;
    }

    // 2) Insert do lead.
    const payload = { ...item.payload, photo_url: photoUrl };
    const { error } = await supabase.from("leads").insert(payload);
    if (error) throw error;

    // 3) Remove do banco local.
    await offlineDb.pendingLeads.delete(item.localId);
  }, []);

  const syncNow = useCallback(async () => {
    if (runningRef.current) return;
    if (!user) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const items = await offlineDb.pendingLeads
      .where("user_id")
      .equals(user.id)
      .toArray();
    if (items.length === 0) {
      setSyncState("idle");
      setLastError(null);
      return;
    }

    runningRef.current = true;
    setSyncState("syncing");
    setLastError(null);

    let success = 0;
    let failed = 0;
    let firstError: string | null = null;

    for (const item of items) {
      try {
        await syncOne(item);
        success += 1;
      } catch (e) {
        failed += 1;
        const message = (e as Error).message ?? "Erro de sincronização";
        if (!firstError) firstError = message;
        // Marca tentativa para diagnosticar.
        await offlineDb.pendingLeads
          .update(item.localId, {
            lastTriedAt: Date.now(),
            lastError: message,
            attempts: (item.attempts ?? 0) + 1,
          })
          .catch(() => {});
      }
    }

    runningRef.current = false;

    if (failed === 0) {
      setSyncState("idle");
      setLastError(null);
      if (success > 0) {
        toast.success(
          success === 1
            ? "1 lead sincronizado com sucesso"
            : `${success} leads sincronizados com sucesso`,
        );
      }
    } else {
      setSyncState("error");
      setLastError(firstError);
      if (success > 0) {
        toast.message(
          `${success} sincronizado(s), ${failed} pendente(s). Tentaremos novamente.`,
        );
      }
    }
  }, [syncOne, user]);

  // Tenta sincronizar quando a conexão volta.
  useEffect(() => {
    const handleOnline = () => {
      // Pequeno delay para o navegador estabilizar a rede
      setTimeout(() => {
        syncNow().catch(() => {});
      }, 800);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncNow]);

  // Tenta sincronizar ao montar (caso o app tenha sido aberto online com
  // pendências) e sempre que o usuário muda.
  useEffect(() => {
    if (!user) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const t = setTimeout(() => {
      syncNow().catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [user?.id, syncNow]);

  // Re-tenta de tempos em tempos quando há pendências e estamos online.
  useEffect(() => {
    if (offline || pendingCount === 0) return;
    const interval = setInterval(() => {
      syncNow().catch(() => {});
    }, 60_000); // a cada 60s
    return () => clearInterval(interval);
  }, [offline, pendingCount, syncNow]);

  return (
    <Ctx.Provider
      value={{ pendingCount, offline, syncState, lastError, syncNow }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSync() {
  return useContext(Ctx);
}
