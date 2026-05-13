import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, User as UserIcon, Eye } from "lucide-react";
import { formatBRL } from "@/lib/format";

type Promoter = {
  id: string;
  full_name: string | null;
  level: string;
  monthly_earnings: number;
  daily_goal: number;
  streak_days: number;
  created_at: string;
  leads_count?: number;
};

export default function RhPromoters() {
  const [list, setList] = useState<Promoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: profiles }, { data: leads }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, level, monthly_earnings, daily_goal, streak_days, created_at",
          )
          .order("monthly_earnings", { ascending: false }),
        supabase.from("leads").select("user_id"),
      ]);

      const counts = new Map<string, number>();
      (leads ?? []).forEach((l) =>
        counts.set(l.user_id, (counts.get(l.user_id) ?? 0) + 1),
      );

      const merged = (profiles ?? []).map((p) => ({
        ...p,
        leads_count: counts.get(p.id) ?? 0,
      })) as Promoter[];
      setList(merged);
      setLoading(false);
    })();
  }, []);

  const filtered = list.filter((p) =>
    !search
      ? true
      : p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.id.includes(search),
  );

  return (
    <div className="space-y-5 lg:space-y-6">
      <section className="rounded-lg border bg-card px-4 py-4 shadow-sm md:px-6 md:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Painel RH
            </p>
            <h1 className="text-2xl font-bold md:text-3xl">Promoters</h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">
              Visualização de todas as promoters cadastradas e seus resultados.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 xl:w-[540px] xl:flex-row xl:items-center xl:justify-end">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 xl:min-w-[160px] xl:justify-center">
              <Eye className="w-3 h-3 mr-1" /> Somente leitura
            </Badge>
          </div>
        </div>
      </section>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {loading && (
          <div className="text-center py-6">
            <Loader2 className="w-5 h-5 animate-spin inline" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center py-6 text-muted-foreground text-sm">Nenhuma promoter</p>
        )}
        {filtered.map((p) => (
          <Card key={p.id} className="p-3 space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{p.full_name ?? "—"}</p>
                <Badge variant="outline" className="text-[10px] mt-0.5">{p.level}</Badge>
              </div>
              <p className="text-sm font-bold tabular-nums shrink-0">
                {formatBRL(p.monthly_earnings)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center border-t pt-2">
              <div>
                <p className="text-base font-bold tabular-nums">{p.leads_count ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Leads</p>
              </div>
              <div>
                <p className="text-base font-bold tabular-nums">{p.daily_goal}</p>
                <p className="text-[10px] text-muted-foreground">Meta diária</p>
              </div>
              <div>
                <p className="text-base font-bold tabular-nums">{p.streak_days}d</p>
                <p className="text-[10px] text-muted-foreground">Streak</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden lg:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Promoter</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Meta diária</TableHead>
              <TableHead className="text-right">Streak</TableHead>
              <TableHead className="text-right">Ganhos/mês</TableHead>
              <TableHead>Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhuma promoter encontrada
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {p.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{p.level}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.leads_count ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.daily_goal}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.streak_days} dias
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums">
                  {formatBRL(p.monthly_earnings)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
