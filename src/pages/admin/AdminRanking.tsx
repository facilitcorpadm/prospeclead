import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  Crown,
  Loader2,
  Medal,
  Minus,
  Store,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";

/* ======================== Tipos ======================== */

type Period = "today" | "week" | "month" | "all";
type Tab = "geral" | "equipe" | "pdv";

type LeadRow = {
  id: string;
  user_id: string;
  status: string;
  value: number | null;
  created_at: string;
  city: string | null;
};

type TxRow = {
  user_id: string;
  amount: number;
  kind: string;
  created_at: string;
};

type PdvRow = {
  id: string;
  name: string;
  user_id: string;
  city: string | null;
  state: string | null;
};

type PdvLeadRow = {
  pdv_id: string;
  user_id: string;
  reward_amount: number;
  created_at: string;
};

type RankRow = {
  id: string;
  name: string;
  subtitle?: string;
  leads: number;
  vendas: number;
  earnings: number;
  conversion: number;
  /** ranking anterior do mesmo grupo, para calcular evolução */
  prevPosition?: number | null;
};

/* ======================== Página ======================== */

const PERIOD_LABEL: Record<Period, string> = {
  today: "Hoje",
  week: "Semana",
  month: "Mês",
  all: "Todo período",
};

function periodWindow(period: Period): { current: Date; previous: Date } {
  const now = new Date();
  const cur = new Date(now);
  const prev = new Date(now);

  if (period === "today") {
    cur.setHours(0, 0, 0, 0);
    prev.setDate(prev.getDate() - 1);
    prev.setHours(0, 0, 0, 0);
    return { current: cur, previous: prev };
  }
  if (period === "week") {
    cur.setDate(cur.getDate() - 7);
    prev.setDate(prev.getDate() - 14);
    return { current: cur, previous: prev };
  }
  if (period === "month") {
    cur.setMonth(cur.getMonth() - 1);
    prev.setMonth(prev.getMonth() - 2);
    return { current: cur, previous: prev };
  }
  return { current: new Date(0), previous: new Date(0) };
}

function getInitials(name?: string | null) {
  const s = (name || "U").trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

const isSold = (s: string) => s === "vendido" || s === "fechado";

export default function AdminRanking() {
  const [period, setPeriod] = useState<Period>("month");
  const [tab, setTab] = useState<Tab>("geral");

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<
    Record<string, { name: string; city: string | null }>
  >({});
  const [pdvs, setPdvs] = useState<PdvRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [pdvLeads, setPdvLeads] = useState<PdvLeadRow[]>([]);

  /* ----- Load all base data once ----- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [pRes, pdvRes, lRes, tRes, plRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, current_location"),
        supabase.from("pdvs").select("id, name, user_id, city, state"),
        supabase
          .from("leads")
          .select("id, user_id, status, value, created_at, city")
          .limit(5000),
        supabase
          .from("wallet_transactions")
          .select("user_id, amount, kind, created_at")
          .gt("amount", 0)
          .in("kind", ["credit", "bonus", "adjustment"])
          .limit(10000),
        supabase
          .from("pdv_leads")
          .select("pdv_id, user_id, reward_amount, created_at")
          .limit(10000),
      ]);

      setProfiles(
        Object.fromEntries(
          (pRes.data ?? []).map((p) => [
            p.id,
            { name: p.full_name ?? "—", city: p.current_location ?? null },
          ]),
        ),
      );
      setPdvs((pdvRes.data ?? []) as PdvRow[]);
      setLeads((lRes.data ?? []) as LeadRow[]);
      setTxs((tRes.data ?? []) as TxRow[]);
      setPdvLeads((plRes.data ?? []) as PdvLeadRow[]);
      setLoading(false);
    })();
  }, []);

  /* ----- Build current + previous ranking for delta arrows ----- */
  const ranking = useMemo<RankRow[]>(() => {
    const { current, previous } = periodWindow(period);

    const buildFor = (since: Date | null, until: Date | null) => {
      const filterBy = (d: string) => {
        const dt = new Date(d);
        if (since && dt < since) return false;
        if (until && dt >= until) return false;
        return true;
      };

      // map por ator: promotor (geral/equipe) ou pdv
      const isPdv = tab === "pdv";
      const map = new Map<string, RankRow>();

      if (isPdv) {
        // ranqueia PDVs
        pdvs.forEach((p) => {
          map.set(p.id, {
            id: p.id,
            name: p.name,
            subtitle:
              [p.city, p.state].filter(Boolean).join(" - ") || "—",
            leads: 0,
            vendas: 0,
            earnings: 0,
            conversion: 0,
          });
        });
        pdvLeads.forEach((pl) => {
          if (until !== null && !filterBy(pl.created_at)) return;
          if (since && new Date(pl.created_at) < since) return;
          const r = map.get(pl.pdv_id);
          if (!r) return;
          r.leads += 1;
          r.earnings += Number(pl.reward_amount ?? 0);
        });
        // vendas: leads gerados pelo PDV que viraram vendido/fechado
        // (cruza por created_at do pdv_lead já considerado)
        // como pdv_leads não tem status do lead, derivamos via leads.user_id+window não é confiável;
        // mantemos vendas = 0 quando não houver vínculo claro.
      } else {
        // promotores (geral/equipe — mesmo cálculo, "equipe" agrupa por cidade abaixo)
        Object.entries(profiles).forEach(([id, info]) => {
          map.set(id, {
            id,
            name: info.name,
            subtitle: info.city ?? undefined,
            leads: 0,
            vendas: 0,
            earnings: 0,
            conversion: 0,
          });
        });
        leads.forEach((l) => {
          if (since && new Date(l.created_at) < since) return;
          if (until !== null && new Date(l.created_at) >= until) return;
          const r = map.get(l.user_id);
          if (!r) return;
          r.leads += 1;
          if (isSold(l.status)) r.vendas += 1;
        });
        txs.forEach((t) => {
          if (since && new Date(t.created_at) < since) return;
          if (until !== null && new Date(t.created_at) >= until) return;
          const r = map.get(t.user_id);
          if (!r) return;
          r.earnings += Number(t.amount);
        });
      }

      const list = Array.from(map.values()).map((r) => ({
        ...r,
        conversion: r.leads > 0 ? (r.vendas / r.leads) * 100 : 0,
      }));

      // Para "equipe" agrupamos por cidade
      if (tab === "equipe") {
        const teams = new Map<string, RankRow>();
        list.forEach((r) => {
          const key = r.subtitle || "Sem equipe";
          const cur = teams.get(key) ?? {
            id: key,
            name: key,
            subtitle: undefined,
            leads: 0,
            vendas: 0,
            earnings: 0,
            conversion: 0,
          };
          cur.leads += r.leads;
          cur.vendas += r.vendas;
          cur.earnings += r.earnings;
          teams.set(key, cur);
        });
        const arr = Array.from(teams.values()).map((t) => ({
          ...t,
          conversion: t.leads > 0 ? (t.vendas / t.leads) * 100 : 0,
        }));
        return arr;
      }

      return list;
    };

    const sortFn = (a: RankRow, b: RankRow) =>
      b.earnings - a.earnings || b.vendas - a.vendas || b.leads - a.leads;

    if (period === "all") {
      const cur = buildFor(null, null).sort(sortFn);
      // sem janela anterior pra comparar
      return cur;
    }

    const cur = buildFor(current, null).sort(sortFn);
    const prev = buildFor(previous, current).sort(sortFn);
    const prevIndex = new Map<string, number>();
    prev.forEach((r, i) => prevIndex.set(r.id, i));
    return cur.map((r, i) => {
      const prevPos = prevIndex.has(r.id) ? prevIndex.get(r.id)! : null;
      return { ...r, prevPosition: prevPos };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, tab, profiles, pdvs, leads, txs, pdvLeads]);

  // Filtra zeros (não tem o que ranquear)
  const visible = useMemo(
    () => ranking.filter((r) => r.leads > 0 || r.earnings > 0),
    [ranking],
  );
  const top3 = visible.slice(0, 3);
  const rest = visible.slice(3);

  const groupLabel = tab === "pdv" ? "PDV" : tab === "equipe" ? "Equipe" : "Promotor";

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Performance
          </p>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Ranking
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Acompanhe os melhores {groupLabel.toLowerCase()}s da plataforma.
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{PERIOD_LABEL.today}</SelectItem>
            <SelectItem value="week">{PERIOD_LABEL.week}</SelectItem>
            <SelectItem value="month">{PERIOD_LABEL.month}</SelectItem>
            <SelectItem value="all">{PERIOD_LABEL.all}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ---------- Tabs ---------- */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-grid">
          <TabsTrigger value="geral" className="gap-1.5">
            <Users className="w-4 h-4" /> Geral
          </TabsTrigger>
          <TabsTrigger value="equipe" className="gap-1.5">
            <Users className="w-4 h-4" /> Por Equipe
          </TabsTrigger>
          <TabsTrigger value="pdv" className="gap-1.5">
            <Store className="w-4 h-4" /> Por PDV
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          Nenhum dado para o período selecionado.
        </Card>
      ) : (
        <>
          {/* ---------- Top 3 destaque ---------- */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {top3.map((r, i) => (
                <PodiumCard
                  key={r.id}
                  position={i + 1}
                  row={r}
                  groupLabel={groupLabel}
                />
              ))}
            </div>
          )}

          {/* ---------- Tabela ---------- */}
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Posição</TableHead>
                  <TableHead>{groupLabel}</TableHead>
                  <TableHead className="text-right">
                    {tab === "pdv" ? "Leads" : "Leads Capturados"}
                  </TableHead>
                  {tab !== "pdv" && (
                    <TableHead className="text-right">Vendas</TableHead>
                  )}
                  <TableHead className="text-right">
                    Comissão Gerada
                  </TableHead>
                  {tab !== "pdv" && (
                    <TableHead className="text-right">% Conversão</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r, i) => {
                  const pos = i + 1;
                  return (
                    <TableRow
                      key={r.id}
                      className={cn(
                        "hover:bg-muted/40",
                        pos <= 3 && "bg-muted/20",
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <PositionBadge pos={pos} />
                          <DeltaArrow
                            current={pos}
                            previous={r.prevPosition ?? null}
                            isAllTime={period === "all"}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {tab === "pdv" ? (
                            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                              <Store className="w-4 h-4 text-muted-foreground" />
                            </div>
                          ) : (
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">
                                {getInitials(r.name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {r.name}
                            </p>
                            {r.subtitle && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {r.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.leads.toLocaleString("pt-BR")}
                      </TableCell>
                      {tab !== "pdv" && (
                        <TableCell className="text-right tabular-nums">
                          {r.vendas.toLocaleString("pt-BR")}
                        </TableCell>
                      )}
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatBRL(r.earnings)}
                      </TableCell>
                      {tab !== "pdv" && (
                        <TableCell className="text-right">
                          <ConversionBadge value={r.conversion} />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

/* ======================== Componentes auxiliares ======================== */

function PodiumCard({
  position,
  row,
  groupLabel,
}: {
  position: number;
  row: RankRow;
  groupLabel: string;
}) {
  const meta = {
    1: {
      bg: "bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent",
      border: "border-amber-500/40",
      ring: "ring-amber-500/30",
      icon: <Crown className="w-4 h-4 text-amber-500" />,
      pillBg: "bg-amber-500 text-white",
      label: "1º LUGAR",
    },
    2: {
      bg: "bg-gradient-to-br from-slate-300/20 via-slate-400/10 to-transparent",
      border: "border-slate-400/40",
      ring: "ring-slate-400/30",
      icon: <Medal className="w-4 h-4 text-slate-400" />,
      pillBg: "bg-slate-400 text-white",
      label: "2º LUGAR",
    },
    3: {
      bg: "bg-gradient-to-br from-orange-500/20 via-orange-600/10 to-transparent",
      border: "border-orange-600/40",
      ring: "ring-orange-600/30",
      icon: <Medal className="w-4 h-4 text-orange-600" />,
      pillBg: "bg-orange-600 text-white",
      label: "3º LUGAR",
    },
  }[position]!;

  return (
    <Card
      className={cn(
        "p-4 border-2 relative overflow-hidden",
        meta.bg,
        meta.border,
        position === 1 && "md:scale-[1.03]",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <Badge
          className={cn(
            "border-transparent text-[10px] font-bold gap-1",
            meta.pillBg,
          )}
        >
          {meta.icon}
          {meta.label}
        </Badge>
        <DeltaArrow
          current={position}
          previous={row.prevPosition ?? null}
          isAllTime={false}
          showLabel
        />
      </div>

      <div className="flex items-center gap-3">
        {groupLabel === "PDV" ? (
          <div
            className={cn(
              "h-14 w-14 rounded-xl bg-background flex items-center justify-center ring-4 shrink-0",
              meta.ring,
            )}
          >
            <Store className="w-6 h-6 text-foreground" />
          </div>
        ) : (
          <Avatar className={cn("h-14 w-14 ring-4 shrink-0", meta.ring)}>
            <AvatarFallback className="bg-background text-foreground text-sm font-bold">
              {getInitials(row.name)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-base truncate">{row.name}</p>
          {row.subtitle && (
            <p className="text-xs text-muted-foreground truncate">
              {row.subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/50">
        <Stat label="Leads" value={row.leads.toLocaleString("pt-BR")} />
        <Stat
          label={groupLabel === "PDV" ? "Comissão" : "Vendas"}
          value={
            groupLabel === "PDV"
              ? formatBRL(row.earnings)
              : row.vendas.toLocaleString("pt-BR")
          }
        />
        <Stat
          label={groupLabel === "PDV" ? "—" : "Conv."}
          value={
            groupLabel === "PDV" ? "—" : `${row.conversion.toFixed(1)}%`
          }
        />
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">
        {label}
      </p>
      <p className="text-sm font-bold tabular-nums mt-0.5 truncate">{value}</p>
    </div>
  );
}

function PositionBadge({ pos }: { pos: number }) {
  if (pos === 1)
    return (
      <div className="h-8 w-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
        <Crown className="w-4 h-4" />
      </div>
    );
  if (pos === 2)
    return (
      <div className="h-8 w-8 rounded-full bg-slate-400 text-white flex items-center justify-center text-xs font-bold shrink-0">
        <Medal className="w-4 h-4" />
      </div>
    );
  if (pos === 3)
    return (
      <div className="h-8 w-8 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
        <Medal className="w-4 h-4" />
      </div>
    );
  return (
    <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">
      {pos}
    </div>
  );
}

function DeltaArrow({
  current,
  previous,
  isAllTime,
  showLabel = false,
}: {
  current: number;
  previous: number | null;
  isAllTime: boolean;
  showLabel?: boolean;
}) {
  if (isAllTime) return null;
  if (previous === null) {
    return (
      <Badge
        variant="outline"
        className="text-[9px] h-5 px-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
      >
        NOVO
      </Badge>
    );
  }
  const diff = previous - current; // positivo = subiu
  if (diff === 0) {
    return (
      <span className="inline-flex items-center text-muted-foreground text-[11px]">
        <Minus className="w-3 h-3" />
        {showLabel && <span className="ml-0.5">—</span>}
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
        <ArrowUp className="w-3 h-3" />
        {showLabel ? `+${diff}` : diff}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-destructive text-[11px] font-semibold">
      <ArrowDown className="w-3 h-3" />
      {Math.abs(diff)}
    </span>
  );
}

function ConversionBadge({ value }: { value: number }) {
  const tone =
    value >= 30
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : value >= 15
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        tone,
      )}
    >
      {value.toFixed(1)}%
    </span>
  );
}
