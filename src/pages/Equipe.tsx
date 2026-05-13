import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Store, Medal, Fuel, ChevronUp } from "lucide-react";
import { formatBRL } from "@/lib/format";

interface PromoterRank {
  id: string;
  full_name: string;
  leads: number;
  earnings: number;
}

interface PartnerRank {
  id: string;
  name: string;
  manager: string;
  leads: number;
  earnings: number;
  isMine: boolean;
}

export default function Equipe() {
  const { user } = useAuth();
  const [promoters, setPromoters] = useState<PromoterRank[]>([]);
  const [partners, setPartners] = useState<PartnerRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // ---------- PROMOTORES (via RPC pública, mostra TODOS) ----------
      const { data: rankData } = await (supabase.rpc as any)("promoters_ranking", {
        _month_start: monthStart.toISOString(),
      });

      const promoterList: PromoterRank[] = (rankData ?? []).map((r: any) => ({
        id: r.id,
        full_name: r.full_name ?? "Promoter",
        leads: Number(r.leads ?? 0),
        earnings: Number(r.earnings ?? 0),
      }));

      // ---------- PARCEIROS PDV ----------
      const { data: pdvsData } = await supabase
        .from("pdvs")
        .select("id, name, user_id, leads_count, reward_per_lead");

      const profileNameById = new Map(
        promoterList.map((p) => [p.id, p.full_name]),
      );

      const partnerList: PartnerRank[] = (pdvsData ?? [])
        .map((p) => ({
          id: p.id,
          name: p.name,
          manager:
            p.user_id === user.id ? "Você" : profileNameById.get(p.user_id) ?? "—",
          leads: p.leads_count ?? 0,
          earnings: Number(p.reward_per_lead ?? 0) * (p.leads_count ?? 0),
          isMine: p.user_id === user.id,
        }))
        .sort((a, b) => b.leads - a.leads);

      if (!cancelled) {
        setPromoters(promoterList);
        setPartners(partnerList);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const myPromoter = promoters.find((p) => p.id === user?.id);
  const myPosition = myPromoter ? promoters.findIndex((p) => p.id === user?.id) + 1 : 0;
  const leaderLeads = promoters[0]?.leads ?? 0;
  const missingForFirst = myPromoter ? Math.max(0, leaderLeads - myPromoter.leads + 1) : 0;

  return (
    <div className="pb-32 -mx-4">
      {/* Header azul "Ranking" */}
      <div className="bg-gradient-to-b from-[hsl(217_91%_55%)] to-[hsl(217_91%_45%)] text-white px-5 pt-6 pb-20 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Trophy className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Ranking</h1>
            <p className="text-xs opacity-85">Mês atual · atualizado agora</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-14">
        <Tabs defaultValue="promoters">
          {/* Tabs sobre o header azul */}
          <TabsList className="grid grid-cols-2 w-full bg-transparent h-auto p-0 gap-0 border-0 mb-2">
            <TabsTrigger
              value="promoters"
              className="flex flex-col items-center gap-1 py-3 rounded-none bg-transparent text-white/70 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-white transition"
            >
              <Users className="w-5 h-5" />
              <span className="text-sm font-semibold">Promotores</span>
            </TabsTrigger>
            <TabsTrigger
              value="partners"
              className="flex flex-col items-center gap-1 py-3 rounded-none bg-transparent text-white/70 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-white transition"
            >
              <Store className="w-5 h-5" />
              <span className="text-sm font-semibold">Parceiros PDV</span>
            </TabsTrigger>
          </TabsList>

          {/* PROMOTORES */}
          <TabsContent value="promoters" className="mt-4 space-y-2.5">
            {loading ? (
              <SkeletonList />
            ) : promoters.length === 0 ? (
              <EmptyState icon={Users} text="Nenhum promoter cadastrado ainda." />
            ) : (
              promoters.map((p, idx) => (
                <PromoterRow
                  key={p.id}
                  pos={idx + 1}
                  promoter={p}
                  isMe={p.id === user?.id}
                />
              ))
            )}
          </TabsContent>

          {/* PARCEIROS PDV */}
          <TabsContent value="partners" className="mt-4 space-y-2.5">
            <Card className="bg-gradient-to-r from-[hsl(142_76%_36%)] to-[hsl(160_84%_39%)] text-white border-0 p-4 flex items-center gap-3 shadow-md">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Fuel className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold leading-tight">Top Parceiros PDV</p>
                <p className="text-xs opacity-90">Mês atual · ordenado por leads capturados</p>
              </div>
            </Card>

            {loading ? (
              <SkeletonList />
            ) : partners.length === 0 ? (
              <EmptyState
                icon={Store}
                text="Nenhum PDV cadastrado ainda. Cadastre seu primeiro parceiro!"
              />
            ) : (
              <>
                {partners.slice(0, 3).map((p, idx) => (
                  <PartnerRow key={p.id} pos={idx + 1} partner={p} />
                ))}

                {partners.length > 3 && (
                  <>
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                        Demais PDVs
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    {partners.slice(3).map((p, idx) => (
                      <PartnerRow key={p.id} pos={idx + 4} partner={p} />
                    ))}
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Barra fixa com sua posição */}
      {myPromoter && (
        <div className="fixed left-0 right-0 bottom-16 px-4 z-30 max-w-[28rem] mx-auto">
          <Card className="bg-[hsl(217_91%_28%)] text-white border-0 p-3.5 flex items-center justify-between rounded-2xl shadow-elegant">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold shrink-0">
                {myPosition}º
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{myPromoter.full_name}</p>
                <p className="text-[11px] opacity-85">
                  Sua posição · {myPromoter.leads} leads
                </p>
              </div>
            </div>
            {myPosition > 1 && (
              <div className="text-right shrink-0 flex items-center gap-2">
                <ChevronUp className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-[10px] opacity-85">Faltam</p>
                  <p className="font-bold text-sm leading-tight">{missingForFirst} leads</p>
                  <p className="text-[10px] opacity-85">p/ 1º lugar</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// ----------------- COMPONENTES -----------------

function MedalIcon({ pos }: { pos: number }) {
  if (pos === 1)
    return (
      <div className="w-8 h-8 rounded-full bg-[hsl(48_100%_50%)] flex items-center justify-center shadow-sm">
        <Medal className="w-4 h-4 text-white" />
      </div>
    );
  if (pos === 2)
    return (
      <div className="w-8 h-8 rounded-full bg-[hsl(0_0%_70%)] flex items-center justify-center shadow-sm">
        <Medal className="w-4 h-4 text-white" />
      </div>
    );
  if (pos === 3)
    return (
      <div className="w-8 h-8 rounded-full bg-[hsl(30_70%_50%)] flex items-center justify-center shadow-sm">
        <Medal className="w-4 h-4 text-white" />
      </div>
    );
  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
      <span className="text-xs font-bold text-muted-foreground">{pos}º</span>
    </div>
  );
}

function podiumStyle(pos: number, isMine?: boolean) {
  if (isMine) return "bg-success/5 border-success/40 ring-1 ring-success/30";
  if (pos === 1) return "bg-[hsl(48_100%_96%)] border-[hsl(48_100%_70%)]";
  if (pos === 2) return "bg-[hsl(0_0%_96%)] border-[hsl(0_0%_82%)]";
  if (pos === 3) return "bg-[hsl(30_70%_95%)] border-[hsl(30_70%_70%)]";
  return "bg-card border-border";
}

function PromoterRow({
  pos,
  promoter,
  isMe,
}: {
  pos: number;
  promoter: PromoterRank;
  isMe: boolean;
}) {
  const initial = promoter.full_name.charAt(0).toUpperCase();
  return (
    <Card className={`p-3.5 border-2 ${podiumStyle(pos, isMe)} flex items-center gap-3`}>
      <MedalIcon pos={pos} />
      <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-base font-bold text-foreground shrink-0">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={`font-bold text-[15px] truncate ${
              isMe ? "text-success" : "text-foreground"
            }`}
          >
            {promoter.full_name}
          </p>
          {isMe && (
            <Badge className="bg-success text-success-foreground border-0 text-[10px] py-0 px-2 leading-4">
              Você
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {promoter.leads} {promoter.leads === 1 ? "lead" : "leads"}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p
          className={`font-bold text-base leading-tight ${
            isMe ? "text-success" : "text-foreground"
          }`}
        >
          {formatBRL(promoter.earnings)}
        </p>
        <p className="text-[10px] text-muted-foreground">este mês</p>
      </div>
    </Card>
  );
}

function PartnerRow({ pos, partner }: { pos: number; partner: PartnerRank }) {
  return (
    <Card
      className={`p-3.5 border-2 ${podiumStyle(pos, partner.isMine)} flex items-center gap-3`}
    >
      <MedalIcon pos={pos} />
      <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center shrink-0">
        <Fuel className="w-5 h-5 text-destructive" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-[15px] truncate text-foreground">{partner.name}</p>
          {partner.isMine && (
            <Badge className="bg-success text-success-foreground border-0 text-[10px] py-0 px-2 leading-4">
              Sua Rede
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          Gerenciado por: <span className="font-medium text-foreground/80">{partner.manager}</span>
        </p>
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center justify-end gap-1">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-bold text-base text-foreground">{partner.leads}</span>
        </div>
        <p className="text-[11px] text-success font-semibold">{formatBRL(partner.earnings)}</p>
      </div>
    </Card>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-[68px] rounded-2xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <Card className="p-8 text-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-muted mx-auto flex items-center justify-center">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </Card>
  );
}
