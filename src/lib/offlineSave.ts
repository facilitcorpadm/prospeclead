// Helpers compartilhados pelas páginas de cadastro (LeadNew, ProspeccaoB2B,
// Frentista) para salvar localmente quando estamos offline ou quando o
// Supabase falha por motivos de rede.
import { offlineDb, makeLocalId, makePhotoPath, type PendingLead, type PendingSource, type LeadInsert } from "@/lib/offlineDb";

export interface QueueLeadArgs {
  user_id: string;
  source: PendingSource;
  payload: Omit<LeadInsert, "photo_url">;
  photoBlob?: Blob | null;
  postSyncWhatsapp?: boolean;
}

/**
 * Enfileira um lead no IndexedDB para envio posterior.
 * Devolve o registro armazenado para que a UI possa reagir (ex.: redirecionar).
 */
export async function queueLeadOffline(args: QueueLeadArgs): Promise<PendingLead> {
  const photoPath = args.photoBlob ? makePhotoPath(args.user_id) : null;

  const item: PendingLead = {
    localId: makeLocalId(),
    user_id: args.user_id,
    source: args.source,
    payload: args.payload,
    photoBlob: args.photoBlob ?? null,
    photoPath,
    createdAt: Date.now(),
    attempts: 0,
    lastError: null,
    lastTriedAt: null,
    postSyncWhatsapp: args.postSyncWhatsapp,
  };
  await offlineDb.pendingLeads.put(item);
  return item;
}

/**
 * Decide se um erro retornado pelo Supabase indica falha de rede e portanto
 * devemos cair no fallback offline. Mantemos a heurística conservadora — se
 * o erro for, por exemplo, uma violação de RLS, NÃO queremos enfileirar
 * silenciosamente, porque o lead nunca conseguiria entrar.
 */
export function isNetworkLikeError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = ((err as Error)?.message ?? "").toLowerCase();
  if (!msg) return false;
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("timeout") ||
    msg.includes("offline") ||
    msg.includes("abort")
  );
}
