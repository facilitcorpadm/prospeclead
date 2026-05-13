// Banco local (IndexedDB via Dexie) para o modo offline.
//
// - `pendingLeads`: leads cadastrados pelo promoter sem internet. Cada item
//   contém o payload pronto para inserir em `public.leads` mais um Blob de
//   foto (B2C/Frentista). Quando a conexão volta, `useSync` faz upload da
//   foto, insere o lead e remove o registro daqui.
//
// - `cachedLeads`: snapshot dos leads vindos do Supabase para que, mesmo
//   sem internet, a tela de "Meus Leads" continue funcionando.
import Dexie, { type Table } from "dexie";
import type { Database } from "@/integrations/supabase/types";

export type LeadKind = Database["public"]["Enums"]["lead_kind"];
export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export type PendingSource = "b2c" | "b2b" | "frentista";

export interface PendingLead {
  // localId é gerado no cliente; ao sincronizar criamos um id real no Supabase.
  localId: string;
  user_id: string;
  source: PendingSource;
  payload: Omit<LeadInsert, "photo_url">;
  photoBlob?: Blob | null;
  // Caminho desejado no bucket — é gerado no cliente para preservar mesmo
  // depois do upload eventual.
  photoPath?: string | null;
  createdAt: number;
  // Última tentativa / mensagem de erro para debugging.
  lastTriedAt?: number | null;
  lastError?: string | null;
  attempts: number;
  // Se o usuário pediu para abrir WhatsApp depois (B2C com action="whatsapp"),
  // não tem efeito offline mas registramos para auditoria.
  postSyncWhatsapp?: boolean;
}

export interface CachedLead extends LeadRow {
  /** Quando este snapshot foi salvo localmente. */
  cachedAt: number;
}

class ProspecLeadDB extends Dexie {
  pendingLeads!: Table<PendingLead, string>;
  cachedLeads!: Table<CachedLead, string>;

  constructor() {
    super("ProspecLeadDB");
    this.version(1).stores({
      // PK localId, índices para busca/filtragem
      pendingLeads: "localId, user_id, source, createdAt",
      // PK id (uuid do Supabase), índice por user_id e por kind para a listagem
      cachedLeads: "id, user_id, kind, created_at",
    });
  }
}

export const offlineDb = new ProspecLeadDB();

/** Gera um localId estável para um lead pendente. */
export function makeLocalId(): string {
  // Não usamos crypto.randomUUID para evitar problemas em browsers antigos.
  return `local_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

/** Caminho-padrão usado para subir a foto no bucket lead-photos. */
export function makePhotoPath(userId: string): string {
  return `${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.jpg`;
}
