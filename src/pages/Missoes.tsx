import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Target, Info } from "lucide-react";
import { formatBRL } from "@/lib/format";

interface LeadRow {
  status: string;
  photo_url: string | null;
  value: number | null;
  vehicle_model: string | null;
}

export default function Missoes() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    (async () => {
      const { data } = await supabase
        .from("leads")
        .select("status,photo_url,value,vehicle_model,created_at")
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString());
      setLeads((data ?? []) as LeadRow[]);
    })();
  }, [user]);

  // ---- Métricas ----
  const coletados = leads.length;
  const respondidos = leads.filter((l) =>
    ["respondido", "vendido", "fechado", "negociando"].includes(l.status),
  ).length;
  const comFoto = leads.filter((l) => !!l.photo_url).length;
  const vendas = leads.filter((l) => ["vendido", "fechado"].includes(l.status)).length;

  // M1
  const m1Goal = 50;
  const m1Pct = Math.min(100, Math.round((respondidos / m1Goal) * 100));
  const m1Done = respondidos >= m1Goal;

  // M2
  const m2Goal = 100;
  const m2Pct = Math.min(100, Math.round((comFoto / m2Goal) * 100));
  const m2Done = comFoto >= m2Goal;

  // M3 - planos
  const planosVendidos = leads.filter(
    (l) =>
      ["vendido", "fechado"].includes(l.status) &&
      (l.vehicle_model ?? "").toLowerCase().includes("plano"),
  ).length;
  const m3Pct = respondidos > 0 ? (planosVendidos / respondidos) * 100 : 0;
  const m3Done = m3Pct >= 5;

  // M4 - acessórios
  const acessoriosVendidos = leads.filter(
    (l) =>
      ["vendido", "fechado"].includes(l.status) &&
      /(redecan|tag|port[áa]til|antifurto|pr)/i.test(l.vehicle_model ?? ""),
  ).length;
  const m4Pct = respondidos > 0 ? (acessoriosVendidos / respondidos) * 100 : 0;
  const m4Done = m4Pct >= 5;

  const missionsDone = [m1Done, m2Done, m3Done, m4Done].filter(Boolean).length;
  const overallPct = Math.round((missionsDone / 4) * 100);

  // Ganhos (ocultos enquanto valores não estão definidos)
  const m1Reward = m1Done ? respondidos * 1 : 0;
  const m2Reward = m2Done ? respondidos * 2 : 0; // retroativo dobra
  const totalEarnings = m1Reward + m2Reward;
  const PRICE_PLACEHOLDER = "A definir";

  return (
    <div className="pb-24 bg-muted/20 min-h-screen">
      {/* Header verde claro */}
      <header className="bg-[hsl(145_55%_94%)] border-b border-[hsl(145_50%_82%)] px-4 py-3 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[hsl(145_60%_35%)]" />
          <h1 className="font-bold text-[hsl(145_60%_25%)]">Missões do Dia</h1>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-[hsl(145_50%_75%)] text-[hsl(145_60%_30%)]">
          {missionsDone} / 4 missões
        </span>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {/* Banner ProspecLead */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-[hsl(220_85%_35%)] via-[hsl(225_85%_25%)] to-[hsl(230_85%_18%)] text-white shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(20_95%_55%)] to-[hsl(15_95%_45%)] flex items-center justify-center shrink-0 text-2xl shadow-lg">
              🔥
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base leading-tight">
                Missões do Dia — ProspecLead
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                {missionsDone} de 4 concluídas · Continue avançando!
              </p>
              <div className="mt-2.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[hsl(35_95%_60%)] to-[hsl(20_95%_55%)] transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ganho acumulado */}
        <Card className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[hsl(45_100%_92%)] flex items-center justify-center shrink-0 text-2xl">
              💰
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Ganho Acumulado Hoje</p>
              <span className="inline-block mt-1 text-[11px] font-bold px-2 py-1 rounded bg-warning/20 text-warning-foreground border border-warning/40 uppercase tracking-wider">
                Valores a definir
              </span>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <span>⏳</span> Política de pagamento em definição
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-extrabold leading-none">{respondidos}</p>
            <p className="text-[11px] text-muted-foreground mt-1">respondidos</p>
          </div>
        </Card>

        {/* M01 - BRONZE */}
        <MissionCard
          number="01"
          tag="🥉 BRONZE"
          tagColor="text-[hsl(25_70%_45%)] bg-[hsl(35_85%_94%)]"
          title="50 Contatos Respondidos"
          description="Faça 50 leads responderem sua mensagem no WhatsApp. Ao atingir esta marca, a recompensa por resposta será liberada (valor a definir)."
          current={respondidos}
          goal={m1Goal}
          unit=""
          pct={m1Pct}
          progressColor="bg-[hsl(25_85%_55%)]"
          rewardLabel="🎁 🔒 Recompensa por lead respondido — valor a definir"
          rewardColor="bg-[hsl(35_85%_94%)] border-[hsl(35_85%_80%)] text-[hsl(25_70%_35%)]"
          footerNote="50 respostas para desbloquear"
          accent="bg-[hsl(35_100%_98%)] border-[hsl(35_85%_88%)]"
        />

        {/* M02 - OURO */}
        <MissionCard
          number="02"
          tag="🏆 OURO — TRAVA DE QUALIDADE"
          tagColor="text-[hsl(45_85%_35%)] bg-[hsl(45_100%_92%)]"
          title="100 Interações com Foto da Placa"
          description="Tire foto da placa em QUALQUER lead — sem precisar atingir a Missão 01 antes. A barra conta todos os leads respondidos que têm foto da placa registrada. Ao acumular 100 interações com foto, a recompensa DOBRA e é aplicada de forma RETROATIVA em todos os respondidos do dia (valores a definir)."
          current={comFoto}
          goal={m2Goal}
          unit=""
          pct={m2Pct}
          progressColor="bg-[hsl(45_90%_55%)]"
          rewardLabel="🎁 🚀 Recompensa em dobro RETROATIVA — valor a definir"
          rewardColor="bg-[hsl(45_100%_92%)] border-[hsl(45_90%_80%)] text-[hsl(35_85%_30%)]"
          footerNote="📸 Tire foto da placa agora → 0/100 respondidos com foto"
          accent="bg-[hsl(45_100%_98%)] border-[hsl(45_90%_85%)]"
        />

        {/* M03 - CONVERSÃO PLANOS */}
        <MissionCard
          number="03"
          tag="🎯 CONVERSÃO PLANOS"
          tagColor="text-[hsl(145_60%_30%)] bg-[hsl(145_55%_92%)]"
          title="Conversão de Planos ≥ 5%"
          description="Calcule: (Planos vendidos ÷ Leads respondidos) × 100. Venda Planos Básico, Essencial ou Premium para pelo menos 5% dos seus leads respondidos."
          current={Number(m3Pct.toFixed(1))}
          goal={5}
          unit="%"
          pct={Math.min(100, (m3Pct / 5) * 100)}
          progressColor="bg-[hsl(145_60%_45%)]"
          rewardLabel="🎁 🔥 Bônus de performance em planos"
          rewardColor="bg-[hsl(145_55%_92%)] border-[hsl(145_50%_78%)] text-[hsl(145_60%_28%)]"
          footerNote={`${planosVendidos} planos vendidos / ${respondidos} respondidos = ${m3Pct.toFixed(1)}%`}
          chips={["💼 Plano Básico", "🔑 Plano Essencial", "💎 Plano Premium"]}
          chipColor="bg-white border-[hsl(145_50%_80%)] text-[hsl(145_60%_30%)]"
          metaLabel="meta: ≥ 5%"
          accent="bg-[hsl(145_55%_97%)] border-[hsl(145_50%_85%)]"
        />

        {/* M04 - CROSS-SELL */}
        <MissionCard
          number="04"
          tag="🛒 CROSS-SELL ACESSÓRIOS"
          tagColor="text-[hsl(35_85%_35%)] bg-[hsl(35_100%_92%)]"
          title="Conversão de Acessórios ≥ 5%"
          description="Cross-sell no ato! Venda acessórios físicos para pelo menos 5% dos leads respondidos. Itens válidos listados abaixo."
          current={Number(m4Pct.toFixed(1))}
          goal={5}
          unit="%"
          pct={Math.min(100, (m4Pct / 5) * 100)}
          progressColor="bg-[hsl(35_90%_55%)]"
          rewardLabel="🎁 💰 Comissão sobre produto físico"
          rewardColor="bg-[hsl(35_100%_92%)] border-[hsl(35_90%_80%)] text-[hsl(25_85%_30%)]"
          footerNote={`${acessoriosVendidos} acessórios vendidos / ${respondidos} respondidos = ${m4Pct.toFixed(1)}%`}
          chips={["🔴 Redecan", "🏷️ Tags", "📦 Portátil", "🛡️ Antifurto", "🚀 Antifurto + PR"]}
          chipColor="bg-white border-[hsl(35_90%_80%)] text-[hsl(35_85%_35%)]"
          metaLabel="meta: ≥ 5%"
          accent="bg-[hsl(35_100%_97%)] border-[hsl(35_90%_85%)]"
        />

        {/* Funil do Dia */}
        <Card className="p-0 overflow-hidden bg-[hsl(220_30%_18%)] text-white border-0">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-white/10">
            <span className="text-lg">📊</span>
            <h3 className="font-bold">Funil do Dia</h3>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-1">
              <FunnelStep icon="📋" value={coletados} label="Coletados" />
              <FunnelArrow />
              <FunnelStep icon="💬" value={respondidos} label="Respondidos" />
              <FunnelArrow />
              <FunnelStep icon="📷" value={comFoto} label="c/ Placa" />
              <FunnelArrow />
              <FunnelStep icon="🛒" value={vendas} label="Vendas" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <MiniStat label="Planos" value={String(planosVendidos)} subtitle={`${m3Pct.toFixed(1)}%`} />
              <MiniStat
                label="Acessórios"
                value={String(acessoriosVendidos)}
                subtitle={`${m4Pct.toFixed(1)}%`}
              />
              <MiniStat
                label="Ganho"
                value="—"
                subtitle="a definir"
                highlight
              />
            </div>
          </div>
        </Card>

        {/* Regras de Negócio */}
        <Card className="p-4 bg-[hsl(45_100%_96%)] border-[hsl(45_85%_82%)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📔</span>
            <h3 className="font-bold text-[hsl(35_85%_30%)]">Regras de Negócio</h3>
          </div>
          <ul className="space-y-2 text-sm">
            <RuleItem
              tag="M1"
              tagColor="bg-[hsl(35_85%_88%)] text-[hsl(25_70%_35%)]"
              text="Bronze: 50 respondidos → libera recompensa por lead (valor a definir)"
            />
            <RuleItem
              tag="M2"
              tagColor="bg-[hsl(45_90%_85%)] text-[hsl(40_85%_30%)]"
              text="Ouro: 100 c/ platePhoto → recompensa em dobro retroativa (valor a definir)"
            />
            <RuleItem
              tag="M3"
              tagColor="bg-[hsl(145_55%_85%)] text-[hsl(145_60%_28%)]"
              text="Planos: (vendas÷respondidos)×100 ≥ 5%"
            />
            <RuleItem
              tag="M4"
              tagColor="bg-[hsl(35_90%_82%)] text-[hsl(25_85%_30%)]"
              text="Acessórios: (vendas÷respondidos)×100 ≥ 5%"
            />
          </ul>
          <div className="mt-3 pt-3 border-t border-[hsl(45_85%_82%)] space-y-1.5 text-xs italic text-[hsl(35_70%_35%)]">
            <p className="flex items-start gap-1.5">
              <span>⚠️</span>
              <span>M2 só conta leads com o campo platePhotoUrl preenchido.</span>
            </p>
            <p className="flex items-start gap-1.5">
              <span>⚠️</span>
              <span>M3 e M4 calculam sobre respondidos (não coletados).</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Sub-components ---------------- */

interface MissionCardProps {
  number: string;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  current: number;
  goal: number;
  unit: string;
  pct: number;
  progressColor: string;
  rewardLabel: string;
  rewardColor: string;
  footerNote: string;
  chips?: string[];
  chipColor?: string;
  metaLabel?: string;
  accent: string;
}

function MissionCard({
  number,
  tag,
  tagColor,
  title,
  description,
  current,
  goal,
  unit,
  pct,
  progressColor,
  rewardLabel,
  rewardColor,
  footerNote,
  chips,
  chipColor,
  metaLabel,
  accent,
}: MissionCardProps) {
  return (
    <Card className={`p-0 overflow-hidden border ${accent}`}>
      {/* header */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="text-xs font-bold text-muted-foreground bg-white border border-border rounded px-1.5 py-0.5 shrink-0">
            {number}
          </span>
          <div className="min-w-0">
            <p className={`text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded inline-block ${tagColor}`}>
              {tag}
            </p>
            <h3 className="font-bold text-base mt-1 leading-tight">{title}</h3>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-white border border-border text-[hsl(15_85%_50%)] inline-flex items-center gap-1">
          <Flame className="w-3 h-3" fill="currentColor" />
          {Math.round(pct)}%
        </span>
      </div>

      {/* description */}
      <div className="mx-4 mb-3 p-3 rounded-lg bg-white border border-border/60 text-xs text-foreground/80 leading-relaxed flex gap-2">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <span>{description}</span>
      </div>

      {/* progress */}
      <div className="px-4">
        <div className="flex items-end justify-between text-sm">
          <span className="text-2xl font-extrabold tabular-nums">
            {current}
            {unit}
          </span>
          <span className="text-xs text-muted-foreground">
            {metaLabel ?? `/ ${goal}${unit}`}
          </span>
        </div>
        <div className="h-1.5 bg-border/60 rounded-full overflow-hidden mt-2">
          <div className={`h-full ${progressColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
          {footerNote}
        </p>
      </div>

      {/* chips */}
      {chips && chips.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${chipColor}`}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* reward */}
      <div className={`m-4 mt-3 rounded-lg px-3 py-2.5 border text-xs font-semibold flex items-center gap-2 ${rewardColor}`}>
        {rewardLabel}
      </div>
    </Card>
  );
}

function FunnelStep({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
      <div className="text-2xl">{icon}</div>
      <div className="text-2xl font-extrabold tabular-nums leading-none">{value}</div>
      <div className="text-[10px] opacity-80 truncate">{label}</div>
    </div>
  );
}

function FunnelArrow() {
  return <div className="text-white/40 text-lg shrink-0">›</div>;
}

function MiniStat({
  label,
  value,
  subtitle,
  highlight,
}: {
  label: string;
  value: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-2.5 text-center ${
        highlight
          ? "bg-gradient-to-br from-[hsl(45_90%_55%)] to-[hsl(35_95%_45%)] text-white"
          : "bg-white/10 border border-white/10"
      }`}
    >
      <p className={`text-[10px] ${highlight ? "opacity-90" : "opacity-70"}`}>{label}</p>
      <p className="text-base font-extrabold leading-none mt-1">{value}</p>
      <p className={`text-[10px] mt-1 ${highlight ? "opacity-90" : "opacity-70"}`}>{subtitle}</p>
    </div>
  );
}

function RuleItem({ tag, tagColor, text }: { tag: string; tagColor: string; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${tagColor}`}>
        {tag}
      </span>
      <span className="text-[hsl(35_70%_25%)]">{text}</span>
    </li>
  );
}
