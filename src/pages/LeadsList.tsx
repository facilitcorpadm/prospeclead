import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSync } from "@/hooks/useSync";
import { offlineDb, type CachedLead } from "@/lib/offlineDb";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/format";
import { openWhatsApp, normalizePhoneBR } from "@/lib/whatsapp";
import { toast } from "sonner";
import { Car, Truck, Search, Plus, ContactRound, MessageCircle, Clock, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

const B2C_STATUSES = ["todos", "prospectado", "contatado", "respondido", "vendido"] as const;
const B2B_STATUSES = ["todos", "prospectado", "contatado", "negociando", "fechado"] as const;

const statusColors: Record<string, string> = {
  prospectado: "bg-muted text-muted-foreground",
  contatado: "bg-brand-blue/15 text-brand-blue",
  respondido: "bg-warning/15 text-warning",
  vendido: "bg-success/15 text-success",
  negociando: "bg-warning/15 text-warning",
  fechado: "bg-success/15 text-success",
};

export default function LeadsList() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { offline, pendingCount } = useSync();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as "b2c" | "b2b") || "b2c";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("todos");
  const [usingCache, setUsingCache] = useState(false);

  // Pendentes locais (Dexie) — exibimos como itens "aguardando envio".
  const pendingLeads = useLiveQuery(
    async () => {
      if (!user) return [];
      return offlineDb.pendingLeads.where("user_id").equals(user.id).toArray();
    },
    [user?.id],
    [],
  ) ?? [];

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 20;

  const fetchLeads = async (pageNum: number, append = false) => {
    if (!user) return;
    setLoading(true);

    const { data, error, count } = await supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (error) {
      toast.error("Erro ao carregar leads: " + error.message);
      setLoading(false);
      return;
    }

    if (data) {
      if (append) {
        setLeads((prev) => [...prev, ...data]);
      } else {
        setLeads(data);
      }
      setHasMore(count ? (pageNum + 1) * PAGE_SIZE < count : false);
      
      // Atualiza cache local no primeiro carregamento
      if (pageNum === 0) {
        try {
          await offlineDb.transaction("rw", offlineDb.cachedLeads, async () => {
            await offlineDb.cachedLeads.where("user_id").equals(user.id).delete();
            const now = Date.now();
            const items: CachedLead[] = data.map((l) => ({ ...(l as Lead), cachedAt: now }));
            if (items.length > 0) await offlineDb.cachedLeads.bulkPut(items);
          });
        } catch { /* silent */ }
      }
    }
    setLoading(false);
    setUsingCache(false);
  };

  useEffect(() => {
    if (!user) return;

    const loadFromCache = async () => {
      const cached = await offlineDb.cachedLeads.where("user_id").equals(user.id).toArray();
      if (cached.length > 0) {
        setLeads(cached.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")) as Lead[]);
        setUsingCache(true);
      }
    };

    loadFromCache();
    fetchLeads(0);
  }, [user]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLeads(nextPage, true);
  };

  const current = useMemo(() => leads.filter((l) => l.kind === tab), [leads, tab]);
  const filtered = useMemo(() => {
    return current.filter((l) => {
      if (filter !== "todos" && l.status !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (l.name?.toLowerCase().includes(s) || l.phone?.toLowerCase().includes(s) || l.vehicle_plate?.toLowerCase().includes(s) || l.company_cnpj?.toLowerCase().includes(s));
      }
      return true;
    });
  }, [current, filter, search]);

  const counts = useMemo(() => {
    const total = current.length;
    const contatados = current.filter((l) => l.status === "contatado").length;
    const vendas = current.filter((l) => l.status === "vendido" || l.status === "fechado").length;
    const negociando = current.filter((l) => l.status === "negociando" || l.status === "respondido").length;
    const fleetTotal = current.reduce((s, l) => s + (l.fleet_size || 0), 0);
    return { total, contatados, vendas, negociando, fleetTotal, conversion: total ? Math.round((vendas / total) * 100) : 0 };
  }, [current]);

  const statuses = tab === "b2c" ? B2C_STATUSES : B2B_STATUSES;
  const banner = tab === "b2c" ? "bg-gradient-leads" : "bg-gradient-b2b";

  return (
    <div className="pb-4">
      {/* Banner */}
      <div className={`${banner} text-primary-foreground px-4 pt-6 pb-6 rounded-b-3xl space-y-4`}>
        <h1 className="text-2xl font-bold">Meus Leads</h1>
        <Tabs value={tab} onValueChange={(v) => { setParams({ tab: v }); setFilter("todos"); }}>
          <TabsList className="bg-white/20 w-full">
            <TabsTrigger value="b2c" className="flex-1 gap-2 data-[state=active]:bg-white data-[state=active]:text-foreground"><Car className="w-4 h-4" /> B2C ({leads.filter(l=>l.kind==="b2c").length})</TabsTrigger>
            <TabsTrigger value="b2b" className="flex-1 gap-2 data-[state=active]:bg-white data-[state=active]:text-foreground"><Truck className="w-4 h-4" /> B2B ({leads.filter(l=>l.kind==="b2b").length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="grid grid-cols-4 gap-2">
          {tab === "b2c" ? (
            <>
              <Stat label="Total" value={counts.total} />
              <Stat label="Contatados" value={counts.contatados} />
              <Stat label="Vendas" value={counts.vendas} />
              <Stat label="Conv." value={`${counts.conversion}%`} />
            </>
          ) : (
            <>
              <Stat label="Empresas" value={counts.total} />
              <Stat label="Contatadas" value={counts.contatados} />
              <Stat label="Negoc." value={counts.negociando} />
              <Stat label="Fechados" value={counts.vendas} />
            </>
          )}
        </div>
        {tab === "b2b" && counts.fleetTotal > 0 && (
          <p className="text-xs opacity-90">Frota total prospectada: <strong>{counts.fleetTotal} veículos</strong></p>
        )}
      </div>

      {/* Search */}
      <div className="px-4 mt-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === "b2c" ? "Buscar por nome, placa, telefone..." : "Buscar empresa, CNPJ..."} className="pl-9" />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize border transition ${filter === s ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}
            >
              {s === "vendido" ? "Lead" : s}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <ContactRound className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum lead aqui ainda</p>
            <Button asChild size="sm"><Link to={tab === "b2b" ? "/prospeccao-b2b" : `/leads/novo?tipo=${tab}`}>Cadastrar primeiro</Link></Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((l) => {
              const hasPhone = !!normalizePhoneBR(l.phone);
              return (
                <Card key={l.id} className="p-3 flex items-center gap-3 hover:bg-muted/40 transition">
                  <Link to={`/leads/${l.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${statusColors[l.status]}`}>
                      {l.kind === "b2c" ? <Car className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{l.name}</p>
                      {l.kind === "b2c" ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {[l.vehicle_model, l.vehicle_plate, l.phone].filter(Boolean).join(" · ")}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate">
                          {[l.company_cnpj, l.fleet_size ? `${l.fleet_size} veículos` : null, l.city].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className={`${statusColors[l.status]} border-0 capitalize`}>{l.status === "vendido" ? "Lead" : l.status}</Badge>
                      {l.value ? <p className="text-xs font-semibold mt-1">{formatBRL(l.value)}</p> : null}
                    </div>
                  </Link>
                  <Button
                    type="button"
                    size="icon"
                    disabled={!hasPhone}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const ok = openWhatsApp(l.phone, {
                        leadName: l.name,
                        senderName: profile?.full_name,
                        vehicleModel: l.vehicle_model,
                        kind: l.kind,
                      });
                      if (!ok) toast.error("Telefone inválido para WhatsApp");
                    }}
                    className="shrink-0 h-10 w-10 rounded-full bg-[hsl(142_70%_45%)] hover:bg-[hsl(142_70%_40%)] text-white disabled:opacity-40"
                    title={hasPhone ? "Enviar WhatsApp" : "Sem telefone"}
                  >
                    <MessageCircle className="w-5 h-5" />
                  </Button>
                </Card>
              );
            })}
            {hasMore && (
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loading}
                className="w-full h-12 mt-4 gap-2 border-dashed border-2 hover:bg-muted/50 transition"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Carregar mais leads
              </Button>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        to={tab === "b2b" ? "/prospeccao-b2b" : `/leads/novo?tipo=${tab}`}
        className={`fixed bottom-24 right-1/2 translate-x-[calc(14rem-1rem)] md:translate-x-[calc(14rem-1rem)] z-30 ${tab === "b2c" ? "bg-gradient-leads" : "bg-gradient-b2b"} text-primary-foreground rounded-full px-5 h-14 flex items-center gap-2 shadow-lg active:scale-95 transition`}
      >
        <Plus className="w-5 h-5" />
        <span className="font-semibold">{tab === "b2c" ? "NOVO LEAD" : "NOVA EMPRESA"}</span>
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2 text-center">
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-[10px] opacity-90">{label}</p>
    </div>
  );
}
