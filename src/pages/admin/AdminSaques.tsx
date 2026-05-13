import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Wallet,
  XCircle,
  X,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { useReadOnly } from "@/hooks/useReadOnly";
import type { Database } from "@/integrations/supabase/types";

type Withdrawal = Database["public"]["Tables"]["wallet_withdrawals"]["Row"];
type WStatus = Database["public"]["Enums"]["withdrawal_status"];

const STATUS_META: Record<
  WStatus,
  { label: string; cls: string; icon: typeof Clock }
> = {
  pendente: {
    label: "Pendente",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    icon: Clock,
  },
  aprovado: {
    label: "Aprovado",
    cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    icon: CheckCircle2,
  },
  pago: {
    label: "Pago",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    icon: CheckCircle2,
  },
  rejeitado: {
    label: "Rejeitado",
    cls: "bg-destructive/15 text-destructive border-destructive/30",
    icon: XCircle,
  },
  cancelado: {
    label: "Cancelado",
    cls: "bg-muted text-muted-foreground border-border",
    icon: XCircle,
  },
};

const PIX_KIND_LABEL: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  phone: "Celular",
  random: "Aleatória",
};

function getInitials(name?: string | null) {
  const s = (name || "U").trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

type ConfirmAction = {
  withdrawal: Withdrawal;
  newStatus: Extract<WStatus, "aprovado" | "pago" | "rejeitado">;
} | null;

export default function AdminSaques() {
  const readOnly = useReadOnly();
  const [list, setList] = useState<Withdrawal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // filtros
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // modal confirmação
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [confirmNotes, setConfirmNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: w, error: we }, { data: p }] = await Promise.all([
      supabase
        .from("wallet_withdrawals")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(500),
      supabase.from("profiles").select("id, full_name"),
    ]);
    if (we) toast.error(we.message);
    setList((w ?? []) as Withdrawal[]);
    setProfiles(
      Object.fromEntries((p ?? []).map((x) => [x.id, x.full_name ?? "—"])),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* ----- Stats ----- */
  const stats = useMemo(() => {
    let totalSolicitado = 0;
    let aPagar = 0;
    let pago = 0;
    let rejeitado = 0;
    list.forEach((w) => {
      const v = Number(w.amount);
      totalSolicitado += v;
      if (w.status === "pendente" || w.status === "aprovado") aPagar += v;
      else if (w.status === "pago") pago += v;
      else if (w.status === "rejeitado") rejeitado += v;
    });
    return { totalSolicitado, aPagar, pago, rejeitado };
  }, [list]);

  /* ----- Filtros ----- */
  const filtered = useMemo(() => {
    return list.filter((w) => {
      if (filterStatus !== "all" && w.status !== filterStatus) return false;
      const d = new Date(w.requested_at);
      if (dateFrom) {
        const f = new Date(dateFrom);
        f.setHours(0, 0, 0, 0);
        if (d < f) return false;
      }
      if (dateTo) {
        const t = new Date(dateTo);
        t.setHours(23, 59, 59, 999);
        if (d > t) return false;
      }
      return true;
    });
  }, [list, filterStatus, dateFrom, dateTo]);

  const pending = useMemo(
    () => list.filter((w) => w.status === "pendente"),
    [list],
  );

  /* ----- Ações ----- */
  const performStatusChange = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("wallet_withdrawals")
        .update({
          status: confirm.newStatus,
          notes: confirmNotes.trim() || null,
        })
        .eq("id", confirm.withdrawal.id);
      if (error) throw error;
      toast.success(`Saque ${STATUS_META[confirm.newStatus].label.toLowerCase()}`);
      setConfirm(null);
      setConfirmNotes("");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar saque");
    } finally {
      setBusy(false);
    }
  };

  const askConfirm = (
    w: Withdrawal,
    s: Extract<WStatus, "aprovado" | "pago" | "rejeitado">,
  ) => {
    setConfirmNotes("");
    setConfirm({ withdrawal: w, newStatus: s });
  };

  const copyPix = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Chave PIX copiada");
  };

  const clearDates = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* ---------- Header ---------- */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Financeiro
        </p>
        <h1 className="text-xl sm:text-2xl font-bold">Saques</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {readOnly
            ? "Acompanhe os saques solicitados pelos promoters (somente leitura)."
            : "Aprove, marque como pago ou rejeite saques solicitados pelos promoters."}
        </p>
      </div>

      {/* ---------- Stats ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Solicitado"
          value={formatBRL(stats.totalSolicitado)}
          icon={<Wallet className="w-4 h-4" />}
          tone="default"
        />
        <StatCard
          label="A Pagar"
          value={formatBRL(stats.aPagar)}
          icon={<TrendingUp className="w-4 h-4" />}
          tone="warning"
        />
        <StatCard
          label="Pago"
          value={formatBRL(stats.pago)}
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="success"
        />
        <StatCard
          label="Rejeitado"
          value={formatBRL(stats.rejeitado)}
          icon={<XCircle className="w-4 h-4" />}
          tone="danger"
        />
      </div>

      {/* ---------- Pendentes em destaque ---------- */}
      {!readOnly && pending.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="font-semibold text-sm">
              {pending.length} saque{pending.length > 1 ? "s" : ""} aguardando
              aprovação
            </h2>
          </div>
          <div className="space-y-2">
            {pending.slice(0, 5).map((w) => (
              <div
                key={w.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-background rounded-lg border p-3"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">
                      {getInitials(profiles[w.user_id])}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {profiles[w.user_id] ?? "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(w.requested_at), "dd/MM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                <p className="font-bold tabular-nums text-base sm:text-lg shrink-0">
                  {formatBRL(Number(w.amount))}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => askConfirm(w, "aprovado")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => askConfirm(w, "rejeitado")}
                    className="text-destructive border-destructive/40 hover:bg-destructive/10 gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            ))}
            {pending.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                + {pending.length - 5} pendente
                {pending.length - 5 > 1 ? "s" : ""} na tabela abaixo
              </p>
            )}
          </div>
        </Card>
      )}

      {/* ---------- Filtros ---------- */}
      <Card className="p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="lg:col-span-3">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="rejeitado">Rejeitado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2 lg:col-span-6">
            <DatePickerButton
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="De"
            />
            <DatePickerButton
              value={dateTo}
              onChange={setDateTo}
              placeholder="Até"
            />
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearDates}
                aria-label="Limpar datas"
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="lg:col-span-3 text-xs text-muted-foreground flex items-center justify-end">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      </Card>

      {/* ---------- Tabela ---------- */}
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Promotor</TableHead>
              <TableHead className="text-right">Valor Solicitado</TableHead>
              <TableHead>Dados Bancários</TableHead>
              <TableHead>Data Solicitação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  Nenhum saque encontrado
                </TableCell>
              </TableRow>
            )}
            {filtered.map((w) => {
              const meta = STATUS_META[w.status];
              const Icon = meta.icon;
              return (
                <TableRow key={w.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">
                          {getInitials(profiles[w.user_id])}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {profiles[w.user_id] ?? "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {w.holder_name}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {formatBRL(Number(w.amount))}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 max-w-[260px]">
                      <Badge variant="outline" className="w-fit text-[10px]">
                        PIX{" "}
                        {PIX_KIND_LABEL[w.pix_key_kind] ?? w.pix_key_kind}
                      </Badge>
                      <button
                        onClick={() => copyPix(w.pix_key)}
                        className="text-xs font-mono truncate text-left hover:text-primary transition-colors group flex items-center gap-1"
                        title="Copiar chave PIX"
                      >
                        <span className="truncate">{w.pix_key}</span>
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(w.requested_at), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={meta.cls}>
                      <Icon className="w-3 h-3 mr-1" />
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {!readOnly ? (
                        <>
                          {w.status === "pendente" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => askConfirm(w, "aprovado")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-8"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => askConfirm(w, "rejeitado")}
                                className="text-destructive border-destructive/40 hover:bg-destructive/10 gap-1 h-8"
                              >
                                <XCircle className="w-4 h-4" />
                                Rejeitar
                              </Button>
                            </>
                          )}
                          {w.status === "aprovado" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => askConfirm(w, "pago")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-8"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Marcar Pago
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => askConfirm(w, "rejeitado")}
                                className="text-destructive border-destructive/40 hover:bg-destructive/10 h-8"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {(w.status === "pago" ||
                            w.status === "rejeitado" ||
                            w.status === "cancelado") && (
                            <span className="text-xs text-muted-foreground italic px-2">
                              Finalizado
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic px-2">
                          Apenas Consulta
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* ---------- Modal Confirmação ---------- */}
      <ConfirmDialog
        action={confirm}
        promoterName={
          confirm ? (profiles[confirm.withdrawal.user_id] ?? "—") : ""
        }
        notes={confirmNotes}
        setNotes={setConfirmNotes}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={performStatusChange}
      />
    </div>
  );
}

/* ======================== Componentes ======================== */

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "default" | "warning" | "success" | "danger";
}) {
  const toneClass = {
    default: "bg-muted text-foreground",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    danger: "bg-destructive/15 text-destructive",
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-lg sm:text-xl font-bold mt-1 tabular-nums truncate">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            toneClass,
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

function DatePickerButton({
  value,
  onChange,
  placeholder,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex-1 justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
          {value ? (
            format(value, "dd/MM/yyyy", { locale: ptBR })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

function ConfirmDialog({
  action,
  promoterName,
  notes,
  setNotes,
  busy,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  promoterName: string;
  notes: string;
  setNotes: (s: string) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;
  const w = action.withdrawal;
  const isReject = action.newStatus === "rejeitado";
  const isPay = action.newStatus === "pago";
  const title = isReject
    ? "Rejeitar saque"
    : isPay
      ? "Confirmar pagamento"
      : "Aprovar saque";
  const description = isReject
    ? "O valor será estornado para o saldo do promoter. Essa ação pode ser revertida apenas com uma nova solicitação."
    : isPay
      ? "Confirme que o PIX foi efetivamente transferido. Após marcar como pago não será possível estornar."
      : "Ao aprovar, o saque ficará pronto para ser pago. O valor permanece bloqueado no saldo do promoter.";

  return (
    <Dialog open={!!action} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Promotor</span>
              <span className="font-medium truncate">{promoterName}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Valor</span>
              <span className="font-bold tabular-nums">
                {formatBRL(Number(w.amount))}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Chave PIX (
                {PIX_KIND_LABEL[w.pix_key_kind] ?? w.pix_key_kind})
              </span>
              <span className="font-mono text-xs truncate max-w-[180px]">
                {w.pix_key}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Titular</span>
              <span className="text-xs truncate">{w.holder_name}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="text-xs">
              {isReject ? "Motivo da rejeição" : "Observação"}{" "}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isReject
                  ? "Ex: Dados bancários inválidos…"
                  : "Ex: Comprovante #12345"
              }
              className="mt-1 min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "gap-2",
              isReject
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                : "bg-emerald-600 hover:bg-emerald-700 text-white",
            )}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isReject ? "Rejeitar" : isPay ? "Confirmar Pagamento" : "Aprovar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
