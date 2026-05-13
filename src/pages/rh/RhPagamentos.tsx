import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CheckCircle2, XCircle, Loader2, Clock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  pix_key: string;
  pix_key_kind: string;
  holder_name: string;
  status: "pendente" | "aprovado" | "pago" | "rejeitado" | "cancelado";
  requested_at: string;
};

export default function RhPagamentos() {
  const [list, setList] = useState<Withdrawal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pendente");

  const load = async () => {
    setLoading(true);
    const [{ data: w }, { data: p }] = await Promise.all([
      supabase
        .from("wallet_withdrawals")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(500),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setList((w ?? []) as Withdrawal[]);
    setProfiles(
      Object.fromEntries((p ?? []).map((x) => [x.id, x.full_name ?? "—"])),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: Withdrawal["status"]) => {
    const { error } = await supabase
      .from("wallet_withdrawals")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Saque marcado como ${status}`);
    load();
  };

  const filtered =
    filter === "all" ? list : list.filter((x) => x.status === filter);

  const totalPending = list
    .filter((x) => x.status === "pendente" || x.status === "aprovado")
    .reduce((s, x) => s + Number(x.amount), 0);

  return (
    <div className="space-y-5 lg:space-y-6">
      <section className="rounded-lg border bg-card px-4 py-4 shadow-sm md:px-6 md:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Financeiro RH
            </p>
            <h1 className="text-2xl font-bold md:text-3xl">Pagamentos PIX</h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">
              Aprovar, marcar como pago ou rejeitar saques solicitados pelas promoters.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 xl:w-[520px] xl:flex-row xl:items-center xl:justify-end">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full xl:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="aprovado">Aprovados</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
                <SelectItem value="rejeitado">Rejeitados</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
            <Card className="px-4 py-3 flex items-center gap-3 bg-warning/10 border-warning/30 xl:min-w-[220px]">
              <Wallet className="w-4 h-4 text-warning shrink-0" />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">A pagar</p>
                <p className="font-bold tabular-nums text-sm sm:text-base">{formatBRL(totalPending)}</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Mobile: cards */}
      <div className="lg:hidden space-y-2">
        {loading && (
          <div className="text-center py-6">
            <Loader2 className="w-5 h-5 animate-spin inline" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center py-6 text-muted-foreground text-sm">Nenhum saque</p>
        )}
        {filtered.map((w) => (
          <Card key={w.id} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {profiles[w.user_id] ?? w.user_id.slice(0, 8)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(w.requested_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <p className="font-bold tabular-nums text-base">
                {formatBRL(Number(w.amount))}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={w.status} />
              <Badge variant="outline" className="text-[10px]">
                {w.pix_key_kind}
              </Badge>
            </div>
            <div className="text-xs space-y-0.5">
              <p className="break-all"><span className="text-muted-foreground">Chave:</span> {w.pix_key}</p>
              <p className="truncate"><span className="text-muted-foreground">Titular:</span> {w.holder_name}</p>
            </div>
            {(w.status === "pendente" || w.status === "aprovado") && (
              <div className="flex items-center gap-1.5 pt-1">
                {w.status === "pendente" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStatus(w.id, "aprovado")}
                  >
                    Aprovar
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-success hover:bg-success/90 text-white flex-1"
                  onClick={() => setStatus(w.id, "pago")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Pago
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setStatus(w.id, "rejeitado")}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden lg:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Promoter</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Chave PIX</TableHead>
              <TableHead>Titular</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Solicitado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-6 text-muted-foreground"
                >
                  Nenhum saque
                </TableCell>
              </TableRow>
            )}
            {filtered.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="text-sm">
                  {profiles[w.user_id] ?? w.user_id.slice(0, 8)}
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums">
                  {formatBRL(Number(w.amount))}
                </TableCell>
                <TableCell className="text-xs">
                  <Badge variant="outline" className="mr-1">
                    {w.pix_key_kind}
                  </Badge>
                  {w.pix_key}
                </TableCell>
                <TableCell className="text-sm">{w.holder_name}</TableCell>
                <TableCell>
                  <StatusBadge status={w.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(w.requested_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {w.status === "pendente" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(w.id, "aprovado")}
                      >
                        Aprovar
                      </Button>
                    )}
                    {(w.status === "pendente" || w.status === "aprovado") && (
                      <>
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-white"
                          onClick={() => setStatus(w.id, "pago")}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Pago
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setStatus(w.id, "rejeitado")}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: Withdrawal["status"] }) {
  const map: Record<
    Withdrawal["status"],
    { cls: string; icon: any; label: string }
  > = {
    pendente: {
      cls: "bg-warning/15 text-warning border-warning/30",
      icon: Clock,
      label: "Pendente",
    },
    aprovado: {
      cls: "bg-primary/15 text-primary border-primary/30",
      icon: CheckCircle2,
      label: "Aprovado",
    },
    pago: {
      cls: "bg-success/15 text-success border-success/30",
      icon: CheckCircle2,
      label: "Pago",
    },
    rejeitado: {
      cls: "bg-destructive/15 text-destructive border-destructive/30",
      icon: XCircle,
      label: "Rejeitado",
    },
    cancelado: {
      cls: "bg-muted text-muted-foreground border-border",
      icon: XCircle,
      label: "Cancelado",
    },
  };
  const m = map[status];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={m.cls}>
      <Icon className="w-3 h-3 mr-1" />
      {m.label}
    </Badge>
  );
}
