import { useEffect, useState, useCallback } from "react";
import { n8nSupabase } from "@/integrations/supabase/n8n-client";
import { Search, MessageCircle, RefreshCw, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface ChatSession {
  session_id: string;
  displayName: string;
  lastMessage?: string;
  lastMessageType?: "human" | "ai";
  lastId?: number;
  messageCount: number;
}

interface LeadListProps {
  selectedSessionId?: string;
  onSelectSession: (session: ChatSession) => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatSessionName(sessionId: string): string {
  const withoutSuffix = sessionId.split("@")[0];
  const digits = withoutSuffix.replace(/\D/g, "");

  // Meta @lid format (internal WhatsApp ID)
  if (sessionId.includes("@lid")) {
    return `WhatsApp ${withoutSuffix.slice(-6)}`;
  }

  // Brazilian number with DDI 55
  if (digits.startsWith("55") && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const num = digits.slice(4);
    if (num.length === 9) return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
    if (num.length === 8) return `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
  }

  // Generic number
  if (digits.length >= 10) {
    return `+${digits}`;
  }

  return sessionId.length > 22 ? sessionId.slice(0, 22) + "…" : sessionId;
}

function formatRelativeTime(id: number): string {
  // Since hora_data_mensagem is NULL, we use id as a proxy for recency
  return `#${id}`;
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-orange-100 text-orange-700",
];

function getAvatarColor(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, "");
  const parts = clean.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.substring(0, 2).toUpperCase() || "WA";
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export function LeadList({ selectedSessionId, onSelectSession }: LeadListProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const loadSessions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    // Fetch all messages ordered by id desc, then group in JS
    const { data, error } = await n8nSupabase
      .from("n8n_chat_histories")
      .select("id, session_id, message")
      .order("id", { ascending: false })
      .limit(2000);

    if (error || !data) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Group by session_id — first occurrence = most recent message
    const sessionMap = new Map<string, ChatSession>();
    const countMap = new Map<string, number>();

    for (const row of data) {
      const sid = row.session_id as string;
      countMap.set(sid, (countMap.get(sid) ?? 0) + 1);

      if (!sessionMap.has(sid)) {
        const msg = row.message as { type: "human" | "ai"; content?: string };
        sessionMap.set(sid, {
          session_id: sid,
          displayName: formatSessionName(sid),
          lastMessage: msg?.content ?? "",
          lastMessageType: msg?.type ?? "human",
          lastId: row.id as number,
          messageCount: 0, // will be updated below
        });
      }
    }

    // Update message counts
    const result: ChatSession[] = [...sessionMap.values()].map((s) => ({
      ...s,
      messageCount: countMap.get(s.session_id) ?? 0,
    }));

    // Sort by last id (proxy for recency since hora_data_mensagem is NULL)
    result.sort((a, b) => (b.lastId ?? 0) - (a.lastId ?? 0));

    setSessions(result);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Realtime: refresh list when new messages arrive
  useEffect(() => {
    const channel = n8nSupabase
      .channel("leadlist_n8n_watcher")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "n8n_chat_histories" }, () => {
        loadSessions();
      })
      .subscribe();
    return () => { n8nSupabase.removeChannel(channel); };
  }, [loadSessions]);

  const filtered = sessions.filter((s) =>
    s.displayName.toLowerCase().includes(search.toLowerCase()) ||
    s.session_id.includes(search)
  );

  return (
    <div className="flex flex-col h-full w-[320px] min-w-[280px] border-r border-border shrink-0 bg-background">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-border shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold tracking-tight">Conversas</h2>
            {sessions.length > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                {sessions.length}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => loadSessions(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar número ou ID..."
            className="pl-9 h-9 bg-muted/50 text-sm border-border/60"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 min-h-0">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Phone className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {sessions.length === 0 ? "Nenhuma conversa ainda" : "Nenhum resultado"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {sessions.length === 0
                ? "As conversas do WhatsApp aparecerão aqui"
                : "Tente outro número ou ID"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col pb-4">
            <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              WhatsApp via n8n
            </div>
            {filtered.map((session) => (
              <SessionItem
                key={session.session_id}
                session={session}
                isSelected={selectedSessionId === session.session_id}
                onSelect={onSelectSession}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─────────────────────────────────────────────
// Session item row
// ─────────────────────────────────────────────
function SessionItem({
  session,
  isSelected,
  onSelect,
}: {
  session: ChatSession;
  isSelected: boolean;
  onSelect: (s: ChatSession) => void;
}) {
  const avatarColor = getAvatarColor(session.session_id);

  return (
    <button
      onClick={() => onSelect(session)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150",
        "hover:bg-muted/60 active:bg-muted border-b border-border/40 last:border-0",
        isSelected && "bg-primary/5 border-l-[3px] border-l-primary"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="w-11 h-11">
          <AvatarFallback className={cn("text-sm font-bold", avatarColor)}>
            {getInitials(session.displayName)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-background" />
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1 mb-0.5">
          <p className={cn("text-sm truncate", isSelected ? "font-semibold text-primary" : "font-medium text-foreground")}>
            {session.displayName}
          </p>
          <span className="text-[10px] text-muted-foreground shrink-0 ml-1 tabular-nums">
            {session.messageCount} msgs
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {session.lastMessageType === "ai" ? "🤖 " : "💬 "}
          {session.lastMessage || "Sem mensagens"}
        </p>
      </div>
    </button>
  );
}
