import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { formatBRL } from "@/lib/format";
import {
  ArrowLeft, Plus, Fuel, MapPin, Users, ContactRound, DollarSign,
  QrCode, Trash2, Map as MapIcon, Info, Wallet, Copy, Download, Power,
} from "lucide-react";

interface PDV {
  id: string;
  short_code: string;
  name: string;
  cnpj: string | null;
  manager_name: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  reward_per_lead: number;
  active: boolean;
  leads_count: number;
  last_lead_at: string | null;
}

export default function Rede() {
  const { user } = useAuth();
  const [pdvs, setPdvs] = useState<PDV[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrFor, setQrFor] = useState<PDV | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("pdvs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPdvs((data ?? []) as PDV[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("pdvs-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pdvs", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const totalEarnings = pdvs.reduce(
    (s, p) => s + Number(p.reward_per_lead) * p.leads_count,
    0,
  );
  const totalLeads = pdvs.reduce((s, p) => s + p.leads_count, 0);
  const ativos = pdvs.filter((p) => p.active).length;
  const avgReward = pdvs.length
    ? pdvs.reduce((s, p) => s + Number(p.reward_per_lead), 0) / pdvs.length
    : 0.5;

  const toggleActive = async (p: PDV) => {
    const { error } = await supabase
      .from("pdvs")
      .update({ active: !p.active })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success(p.active ? "PDV desativado" : "PDV ativado");
  };

  const removePdv = async (p: PDV) => {
    if (!confirm(`Excluir o PDV "${p.name}"? Os leads já capturados são mantidos.`))
      return;
    const { error } = await supabase.from("pdvs").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success("PDV excluído");
  };

  return (
    <div className="pb-8">
      {/* Header azul como no print */}
      <div className="bg-gradient-pdv text-primary-foreground -mx-4 px-4 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild size="icon" variant="ghost" className="text-primary-foreground hover:bg-white/15 -ml-2">
              <Link to="/"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight truncate">Minha Rede de Parceiros</h1>
              <p className="text-xs opacity-80">PDVs · Postos · Lojas</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-white/15">
              <MapIcon className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-white/15">
              <Info className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Card de renda passiva (preto como no print) */}
      <Card className="mt-4 p-5 bg-foreground text-background border-0 space-y-3">
        <Badge className="bg-warning/20 text-warning hover:bg-warning/30 border-0 gap-1">
          💰 RENDA PASSIVA DA REDE
        </Badge>
        <div>
          <p className="text-3xl font-bold">
            <span className="text-base font-normal opacity-80">R$ </span>
            {totalEarnings.toFixed(2).replace(".", ",")}
          </p>
          <p className="text-xs opacity-70">Ganhos da minha Rede de PDVs</p>
        </div>
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10">
          <Stat icon={Fuel} value={pdvs.length} label="PDVs" />
          <Stat icon={Users} value={ativos} label="Ativos" />
          <Stat icon={ContactRound} value={totalLeads} label="Leads Gerados" />
          <Stat icon={DollarSign} value={formatBRL(avgReward)} label="por lead" />
        </div>
      </Card>

      {/* Lista de PDVs */}
      <div className="mt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground px-1 mb-2">Seus PDVs</p>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : pdvs.length === 0 ? (
          <Card className="py-12 px-4 text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-accent mx-auto flex items-center justify-center">
              <Fuel className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <p className="font-semibold">Nenhum PDV cadastrado ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastre o primeiro posto parceiro e comece<br />
                a gerar renda passiva automática!
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {pdvs.map((p) => (
              <Card key={p.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-pdv flex items-center justify-center text-primary-foreground shrink-0">
                      <Fuel className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.name}</p>
                      {(p.city || p.state) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {p.city}{p.state ? ` - ${p.state}` : ""}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        Código: {p.short_code}
                      </p>
                    </div>
                  </div>
                  <Badge variant={p.active ? "default" : "secondary"} className="shrink-0">
                    {p.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="Leads" value={String(p.leads_count)} />
                  <MiniStat label="Por lead" value={formatBRL(Number(p.reward_per_lead))} />
                  <MiniStat
                    label="Renda"
                    value={formatBRL(Number(p.reward_per_lead) * p.leads_count)}
                    highlight
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button onClick={() => setQrFor(p)} size="sm" variant="outline" className="flex-1 gap-1">
                    <QrCode className="w-4 h-4" /> QR Code
                  </Button>
                  <Button onClick={() => toggleActive(p)} size="sm" variant="ghost" className="gap-1">
                    <Power className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => removePdv(p)} size="sm" variant="ghost" className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Aviso amarelo */}
      <Card className="mt-4 p-3 bg-warning/10 border-warning/30 flex gap-2 items-start">
        <span>💡</span>
        <p className="text-xs text-foreground">
          Cada PDV pode gerar dezenas de leads por dia sem você precisar estar presente!
        </p>
      </Card>

      {/* FAB cadastrar */}
      <Button
        asChild
        className="fixed bottom-20 right-4 z-40 shadow-elegant gap-2 rounded-full px-5 h-12 bg-success hover:bg-success/90 text-success-foreground"
      >
        <Link to="/rede/novo">
          <Plus className="w-5 h-5" /> Cadastrar Novo PDV
        </Link>
      </Button>

      {/* Modal QR */}
      <Dialog open={!!qrFor} onOpenChange={(o) => !o && setQrFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code do PDV</DialogTitle>
          </DialogHeader>
          {qrFor && <QrPanel pdv={qrFor} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Fuel; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Icon className="w-4 h-4 text-warning mb-1" />
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] opacity-70">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2 ${highlight ? "bg-success/10 text-success" : "bg-muted"}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function QrPanel({ pdv }: { pdv: PDV }) {
  const url = `${window.location.origin}/pdv/${pdv.short_code}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const download = () => {
    const svg = document.getElementById("pdv-qr-svg") as unknown as SVGSVGElement | null;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${pdv.short_code}.svg`;
    a.click();
  };

  return (
    <div className="space-y-3 text-center">
      <p className="font-semibold">{pdv.name}</p>
      <div className="bg-white p-4 rounded-xl inline-block mx-auto">
        <QRCodeSVG id="pdv-qr-svg" value={url} size={200} level="M" includeMargin />
      </div>
      <p className="text-xs text-muted-foreground break-all px-2">{url}</p>
      <div className="flex gap-2">
        <Button onClick={copy} variant="outline" className="flex-1 gap-1">
          <Copy className="w-4 h-4" /> Copiar link
        </Button>
        <Button onClick={download} className="flex-1 gap-1">
          <Download className="w-4 h-4" /> Baixar QR
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
        <Wallet className="w-3 h-3" /> Cada lead pelo QR credita {formatBRL(Number(pdv.reward_per_lead))} na sua carteira
      </p>
    </div>
  );
}
