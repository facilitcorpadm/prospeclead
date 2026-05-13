import { useEffect, useState, useRef, useCallback } from "react";
import { n8nSupabase } from "@/integrations/supabase/n8n-client";
import { ChatSession } from "./LeadList";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User, Wifi, WifiOff, MessageSquareOff, Hash, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendAdminWhatsAppMessage } from "@/lib/whatsapp";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface RawMessage {
  type: "human" | "ai" | "admin";
  content?: string;
  additional_kwargs?: Record<string, unknown>;
  response_metadata?: Record<string, unknown>;
  tool_calls?: unknown[];
  invalid_tool_calls?: unknown[];
}

interface ChatMessage {
  id: number;
  session_id: string;
  message: RawMessage;
  hora_data_mensagem: string | null;
}

interface ChatAreaProps {
  session: ChatSession | null;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatTime(dateStr: string | null, id: number): string {
  if (dateStr) {
    try { return format(new Date(dateStr), "HH:mm", { locale: ptBR }); } catch { /* */ }
  }
  return `msg ${id}`;
}

function isSameGroup(a: ChatMessage, b: ChatMessage): boolean {
  if (a.hora_data_mensagem && b.hora_data_mensagem) {
    try {
      const da = new Date(a.hora_data_mensagem);
      const db = new Date(b.hora_data_mensagem);
      return da.getFullYear() === db.getFullYear() &&
        da.getMonth() === db.getMonth() &&
        da.getDate() === db.getDate();
    } catch { /* */ }
  }
  // If both null, group by every 20 messages
  return Math.floor(a.id / 20) === Math.floor(b.id / 20);
}

function getContent(msg: RawMessage): string {
  return msg?.content ?? "(sem conteúdo)";
}

// ─────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-muted/5 h-full select-none">
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner">
          <Bot className="w-9 h-9 text-primary/50" />
        </div>
        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-background flex items-center justify-center">
          <Wifi className="w-3 h-3 text-emerald-500" />
        </span>
      </div>
      <h3 className="text-lg font-semibold text-foreground/80 mb-1">Caixa de Entrada</h3>
      <p className="text-sm text-muted-foreground max-w-xs text-center leading-relaxed">
        Selecione uma conversa na lista lateral para visualizar o histórico monitorado pelo n8n.
      </p>
    </div>
  );
}

function NoMessages({ sessionId }: { sessionId: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 select-none px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
        <MessageSquareOff className="w-7 h-7 text-muted-foreground/40" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Sem mensagens</p>
        <p className="text-[11px] text-muted-foreground/50 mt-1 font-mono">{sessionId}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Date/group separator
// ─────────────────────────────────────────────
function GroupSeparator({ msg }: { msg: ChatMessage }) {
  const label = msg.hora_data_mensagem
    ? (() => { try { return format(new Date(msg.hora_data_mensagem), "EEEE, dd 'de' MMMM", { locale: ptBR }); } catch { return ""; } })()
    : `Grupo de mensagens ${Math.floor(msg.id / 20) + 1}`;

  return (
    <div className="flex items-center gap-3 my-4 px-2 select-none">
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────
function MessageBubble({ msg, displayName }: { msg: ChatMessage; displayName: string }) {
  const type = msg.message?.type;
  const isAI    = type === "ai";
  const isAdmin = type === "admin";
  const isHuman = type === "human" || (!isAI && !isAdmin);
  const content  = getContent(msg.message);
  const timeStr  = formatTime(msg.hora_data_mensagem, msg.id);

  // Cliente (human) → esquerda. IA e Atendente → direita.
  const onLeft = isHuman;

  // Identificação clara: nome + telefone/sessão para o cliente
  const senderName = isAI
    ? "Assistente Ray (IA)"
    : isAdmin
      ? "Atendente (Você)"
      : displayName;

  const senderSubtitle = isHuman ? (msg.session_id || "") : "";

  const labelColor = isAI
    ? "text-violet-600"
    : isAdmin
      ? "text-blue-600"
      : "text-emerald-700";

  const bubbleClass = isAI
    ? "bg-violet-50 border border-violet-200 text-foreground rounded-2xl rounded-tl-none"
    : isAdmin
      ? "bg-blue-500 text-white rounded-2xl rounded-tr-none"
      : "bg-emerald-500 text-white rounded-2xl rounded-tl-none";

  const Avatar = (
    <div className={cn(
      "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm mb-1",
      isAI ? "bg-violet-500" : isAdmin ? "bg-blue-500" : "bg-emerald-500"
    )}>
      {isAI ? <Bot className="w-3.5 h-3.5 text-white" /> : <User className="w-3.5 h-3.5 text-white" />}
    </div>
  );

  return (
    <div className={cn("flex w-full items-end gap-2 mb-2", onLeft ? "justify-start" : "justify-end")}>
      {onLeft && Avatar}

      <div className={cn("group relative max-w-[72%] sm:max-w-[60%] flex flex-col", onLeft ? "items-start" : "items-end")}>
        {/* Sender label sempre visível */}
        <span className={cn("text-[11px] font-semibold mb-1 px-1 flex items-center gap-1", labelColor)}>
          {isAI ? <Bot className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
          {senderName}
          {senderSubtitle && (
            <span className="text-muted-foreground font-normal font-mono text-[10px]">• {senderSubtitle}</span>
          )}
        </span>

        {/* Bubble */}
        <div className={cn(
          "relative px-4 py-2.5 shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words",
          bubbleClass
        )}>
          {content}
        </div>

        {/* Timestamp sempre visível */}
        <span className="text-[10px] mt-1 px-1 text-muted-foreground">
          {timeStr}
        </span>
      </div>

      {!onLeft && Avatar}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export function ChatArea({ session }: ChatAreaProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
    }, 80);
  }, []);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 150);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || !session?.session_id || sending) return;

    setSending(true);
    setError(null);

    try {
      await sendAdminWhatsAppMessage({
        sessionId: session.session_id,
        message: text,
      });

      setInputValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      scrollToBottom(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar";
      setError(msg);
    } finally {
      setSending(false);
    }
  }, [inputValue, session, sending, scrollToBottom]);

  useEffect(() => {
    if (!session?.session_id) {
      setMessages([]);
      setConnected(false);
      return;
    }

    const sid = session.session_id;
    let cancelled = false;
    let activeChannel: ReturnType<typeof n8nSupabase.channel> | null = null;

    async function load() {
      setLoading(true);
      setMessages([]);

      const { data, error } = await n8nSupabase
        .from("n8n_chat_histories")
        .select("*")
        .eq("session_id", sid)
        .order("id", { ascending: true })
        .limit(500);

      if (!cancelled) {
        setMessages(error || !data ? [] : (data as unknown as ChatMessage[]));
        setLoading(false);
        scrollToBottom(false);
      }

      // Realtime subscription
      activeChannel = n8nSupabase
        .channel(`chat_rt_${sid.replace(/[^a-zA-Z0-9]/g, "_")}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "n8n_chat_histories", filter: `session_id=eq.${sid}` },
          (payload) => {
            if (!cancelled) {
              setMessages((prev) => [...prev, payload.new as unknown as ChatMessage]);
              scrollToBottom(true);
            }
          }
        )
        .subscribe((status) => {
          if (!cancelled) setConnected(status === "SUBSCRIBED");
        });
    }

    load();

    return () => {
      cancelled = true;
      if (activeChannel) n8nSupabase.removeChannel(activeChannel);
      setConnected(false);
    };
  }, [session, scrollToBottom]);

  if (!session) return <EmptyState />;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-background border-b border-border flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center font-bold text-emerald-700 text-sm">
              WA
            </div>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
              connected ? "bg-emerald-500" : "bg-muted-foreground/40"
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{session.displayName}</h3>
            <div className="flex items-center gap-1">
              <Hash className="w-2.5 h-2.5 text-muted-foreground/40" />
              <p className="text-[10px] text-muted-foreground font-mono leading-tight truncate max-w-[200px]">
                {session.session_id}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {connected
            ? <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            : <WifiOff className="w-3.5 h-3.5 text-muted-foreground/50" />}
          <span className={cn("text-[10px] font-medium", connected ? "text-emerald-600" : "text-muted-foreground/50")}>
            {connected ? "Ao vivo" : "Conectando..."}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{ background: "radial-gradient(ellipse at top, hsl(var(--muted)/0.15) 0%, transparent 70%)" }}
      >
        {loading ? (
          <div className="flex flex-col gap-4 pt-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn("flex gap-2 animate-pulse", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <div className="w-7 h-7 rounded-full bg-muted shrink-0 self-end" />
                <div className={cn("h-12 rounded-2xl bg-muted", i % 2 === 0 ? "w-52" : "w-36")} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <NoMessages sessionId={session.session_id} />
        ) : (
          <>
            {messages.map((msg, index) => {
              const showSeparator = index === 0 || !isSameGroup(messages[index - 1], msg);
              return (
                <div key={msg.id ?? index}>
                  {showSeparator && <GroupSeparator msg={msg} />}
                  <MessageBubble msg={msg} displayName={session.displayName} />
                </div>
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-background border-t border-border shrink-0">
        {error && (
          <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none">×</button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); adjustTextareaHeight(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Digite sua mensagem..."
            className="flex-1 min-h-[44px] max-h-[150px] resize-none rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            rows={1}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            className={cn(
              "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all",
              inputValue.trim() && !sending
                ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-md hover:shadow-lg hover:scale-105"
                : "bg-muted text-muted-foreground/50 cursor-not-allowed"
            )}
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
          Enter = enviar • Shift+Enter = nova linha
        </p>
      </div>
    </div>
  );
}

