import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProspectingTimer } from "@/hooks/useProspectingTimer";
import { useSync } from "@/hooks/useSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Search, Save, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { queueLeadOffline, isNetworkLikeError } from "@/lib/offlineSave";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

const PAINS = [
  { id: "multas", label: "Gestão de Multas", icon: "📋" },
  { id: "produtividade", label: "Produtividade", icon: "⚡" },
  { id: "sensores", label: "Sensores", icon: "🛰️" },
  { id: "cameras", label: "Câmeras", icon: "📹" },
  { id: "motorista", label: "Identificar Motorista", icon: "👤" },
];

const CALENDLY_URL = "https://calendly.com/";

export default function ProspeccaoB2B() {
  const { user } = useAuth();
  const { registerActivity } = useProspectingTimer();
  const { offline } = useSync();
  const navigate = useNavigate();

  // Empresa
  const [cnpj, setCnpj] = useState("");
  const [razao, setRazao] = useState("");
  const [fantasia, setFantasia] = useState("");
  const [cnae, setCnae] = useState("");
  const [endereco, setEndereco] = useState("");
  const [frota, setFrota] = useState("");
  const [cnpjBusy, setCnpjBusy] = useState(false);

  // Gestor
  const [gestorNome, setGestorNome] = useState("");
  const [gestorTel, setGestorTel] = useState("");
  const [gestorEmail, setGestorEmail] = useState("");

  // Decisor
  const [decisorNome, setDecisorNome] = useState("");
  const [decisorTel, setDecisorTel] = useState("");
  const [decisorEmail, setDecisorEmail] = useState("");

  // Qualificação + dores
  const [hasTracker, setHasTracker] = useState<null | boolean>(null);
  const [pains, setPains] = useState<string[]>([]);
  const togglePain = (id: string) =>
    setPains((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const [busy, setBusy] = useState(false);

  const buscarCNPJ = async () => {
    const clean = cnpj.replace(/\D/g, "");
    if (clean.length !== 14) {
      toast.error("Digite um CNPJ válido (14 dígitos)");
      return;
    }
    setCnpjBusy(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const d = await res.json();
      setRazao(d.razao_social ?? "");
      setFantasia(d.nome_fantasia ?? "");
      setCnae(d.cnae_fiscal_descricao ?? "");
      const addr = [
        d.logradouro,
        d.numero,
        d.bairro,
        d.municipio,
        d.uf,
      ]
        .filter(Boolean)
        .join(", ");
      setEndereco(addr);
      toast.success("Dados preenchidos");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao buscar CNPJ");
    } finally {
      setCnpjBusy(false);
    }
  };

  const salvar = async (afterCalendly = false) => {
    if (!user) return;
    if (!razao.trim()) {
      toast.error("Informe a Razão Social");
      return;
    }
    if (!gestorNome.trim() || !gestorTel.trim()) {
      toast.error("Informe nome e telefone do gestor");
      return;
    }
    setBusy(true);
    const phone = gestorTel.replace(/\D/g, "");
    const fleetSize = frota ? Number(frota.replace(/\D/g, "")) : null;
    const painsLine = pains.length
      ? ` | Dores: ${pains
          .map((p) => PAINS.find((x) => x.id === p)?.label)
          .filter(Boolean)
          .join(", ")}`
      : "";
    const trackerLine =
      hasTracker === null ? "" : ` | Rastreamento: ${hasTracker ? "Sim" : "Não"}`;
    const decisorLine = decisorNome
      ? ` | Decisor: ${decisorNome}${decisorTel ? " (" + decisorTel + ")" : ""}${
          decisorEmail ? " " + decisorEmail : ""
        }`
      : "";
    const cnaeLine = cnae ? ` | CNAE: ${cnae}` : "";
    const fantasiaLine = fantasia ? ` (${fantasia})` : "";
    const enderecoLine = endereco ? ` | End: ${endereco}` : "";

    const basePayload: Omit<LeadInsert, "photo_url"> = {
      user_id: user.id,
      kind: "b2b",
      name: razao + fantasiaLine,
      phone: phone || null,
      company_cnpj: cnpj.replace(/\D/g, "") || null,
      fleet_size: fleetSize,
      city: endereco || null,
      vehicle_model:
        `Gestor: ${gestorNome}${gestorEmail ? " <" + gestorEmail + ">" : ""}${cnaeLine}${enderecoLine}${trackerLine}${painsLine}${decisorLine}`.slice(
          0,
          500,
        ),
      status: "prospectado",
    };

    const finishOk = (offlineSave: boolean) => {
      registerActivity();
      toast.success(
        offlineSave
          ? "Salvo localmente — enviaremos quando voltar a internet"
          : "Lead B2B salvo!",
      );
      if (afterCalendly) {
        window.open(CALENDLY_URL, "_blank", "noopener");
      }
      navigate("/leads?tab=b2b");
    };

    const saveOffline = async () => {
      await queueLeadOffline({
        user_id: user.id,
        source: "b2b",
        payload: basePayload,
      });
      finishOk(true);
    };

    if (offline) {
      try {
        await saveOffline();
      } catch (e: any) {
        toast.error(e?.message ?? "Não foi possível salvar localmente");
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      const payload: LeadInsert = { ...basePayload, photo_url: null };
      const { error } = await supabase.from("leads").insert(payload);
      if (error) throw error;
      finishOk(false);
    } catch (e: any) {
      if (isNetworkLikeError(e)) {
        try {
          await saveOffline();
        } catch (offErr: any) {
          toast.error(offErr?.message ?? "Não foi possível salvar localmente");
        }
      } else {
        toast.error(e.message ?? "Erro ao salvar");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-b2b text-primary-foreground px-4 py-5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/15 shrink-0">
            <Link to="/"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <h1 className="font-bold tracking-tight truncate">🏢 Prospecção B2B — Frotas</h1>
        </div>
        <span className="shrink-0 text-xs font-bold bg-success/90 text-white px-3 py-1.5 rounded-full">
          💰 +R$ 10,00
        </span>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Banner SDR */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-[hsl(220,40%,18%)] to-[hsl(220,30%,12%)] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
              <span className="text-xl">💼</span>
            </div>
            <h2 className="font-bold tracking-wide text-sm">SDR DE CAMPO — B2B CORPORATIVO</h2>
          </div>
          <p className="mt-4 text-sm text-white/80">Reunião realizada =</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-lg bg-success/20 text-success font-bold text-sm border border-success/40">
              R$ 10,00 garantidos
            </span>
            <span className="text-white/60">+</span>
            <span className="px-3 py-1.5 rounded-lg bg-warning/20 text-warning font-bold text-sm border border-warning/40">
              1% TCV frota
            </span>
          </div>
          <p className="mt-3 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/80">
            📊 Exemplo: Frota de 50 caminhões × R$150/mês × 12 meses = R$ 90.000/ano → Sua comissão: R$ 900,00
          </p>
        </div>

        {/* Identificação */}
        <Section title="Identificação da Empresa" icon="🏢" color="text-primary">
          <Field label="🔎 CNPJ da Empresa">
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="bg-muted/40"
              />
              <Button type="button" onClick={buscarCNPJ} disabled={cnpjBusy} className="shrink-0 bg-primary">
                {cnpjBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Digite o CNPJ e toque em <Search className="inline w-3 h-3" /> para preencher automaticamente
            </p>
          </Field>

          <Field label="🏛️ Razão Social *" required>
            <Input value={razao} onChange={(e) => setRazao(e.target.value)} placeholder="Ex: Mineração Vale S.A." className="bg-muted/40" />
          </Field>
          <Field label="✨ Nome Fantasia">
            <Input value={fantasia} onChange={(e) => setFantasia(e.target.value)} placeholder="Nome comercial / apelido da empresa" className="bg-muted/40" />
          </Field>
          <Field label="🏭 Ramo de Atividade (CNAE)">
            <Input value={cnae} onChange={(e) => setCnae(e.target.value)} placeholder="Ex: Transporte rodoviário de cargas" className="bg-muted/40" />
          </Field>
          <Field label="📍 Endereço Completo *" required>
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, Número, Bairro, Cidade, Estado" className="bg-muted/40" />
          </Field>
          <Field label="🚛 Tamanho da Frota (nº veículos) *" required>
            <Input inputMode="numeric" value={frota} onChange={(e) => setFrota(e.target.value)} placeholder="Ex: 80" className="bg-muted/40" />
          </Field>
        </Section>

        {/* Gestor */}
        <Section title="Gestor da Frota" icon="👔" color="text-primary">
          <Field label="👤 Nome do Gestor *" required>
            <Input value={gestorNome} onChange={(e) => setGestorNome(e.target.value)} placeholder="Ex: Carlos Oliveira" className="bg-muted/40" />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="📱 Telefone / WhatsApp *" required>
              <Input value={gestorTel} onChange={(e) => setGestorTel(e.target.value)} placeholder="(11) 99999-9999" className="bg-muted/40" />
            </Field>
            <Field label="📧 E-mail">
              <Input type="email" value={gestorEmail} onChange={(e) => setGestorEmail(e.target.value)} placeholder="gestor@empresa.com" className="bg-muted/40" />
            </Field>
          </div>
        </Section>

        {/* Decisor */}
        <Section title="Decisor — Diretor / Dono" icon="🎯" color="text-success">
          <p className="text-xs bg-success/5 border border-success/20 rounded-lg px-3 py-2 text-success">
            💡 Quem autoriza a compra? Falar com o decisor acelera 3× o fechamento.
          </p>
          <Field label="👤 Nome do Decisor">
            <Input value={decisorNome} onChange={(e) => setDecisorNome(e.target.value)} placeholder="Ex: Diretor de Operações" className="bg-muted/40" />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="📱 Tel. do Decisor">
              <Input value={decisorTel} onChange={(e) => setDecisorTel(e.target.value)} placeholder="(11) 98888-8888" className="bg-muted/40" />
            </Field>
            <Field label="📧 E-mail Decisor">
              <Input type="email" value={decisorEmail} onChange={(e) => setDecisorEmail(e.target.value)} placeholder="diretor@empresa.com" className="bg-muted/40" />
            </Field>
          </div>
        </Section>

        {/* Qualificação Corporativa */}
        <Section title="Qualificação Corporativa" icon="🔍" color="text-warning">
          <p className="text-sm">🛰️ Possui rastreamento na frota atualmente?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHasTracker(true)}
              className={`h-12 rounded-xl border bg-card text-center text-sm font-medium transition ${
                hasTracker === true ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              ✅ Sim
            </button>
            <button
              type="button"
              onClick={() => setHasTracker(false)}
              className={`h-12 rounded-xl border bg-card text-center text-sm font-medium transition ${
                hasTracker === false ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              ❌ Não
            </button>
          </div>
        </Section>

        {/* Dores */}
        <Section title="Principais Dores / Desejos" icon="🎯" color="text-destructive">
          <p className="text-xs bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2 text-destructive">
            📌 Selecione todas que se aplicam. Isso irá gerar o script IA personalizado.
          </p>
          <div className="space-y-2">
            {PAINS.map((p) => {
              const active = pains.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePain(p.id)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-card text-left transition ${
                    active ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">{p.icon}</span>
                    <span className="text-sm font-medium">{p.label}</span>
                  </span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      active ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {active && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* CTAs */}
        <div className="space-y-3 pt-2">
          <Button
            type="button"
            onClick={() => salvar(false)}
            disabled={busy}
            className="w-full h-14 bg-gradient-b2b text-primary-foreground text-base font-bold shadow-lg"
          >
            {busy ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            💾 SALVAR LEAD B2B
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => salvar(true)}
            disabled={busy}
            className="w-full h-12"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            📅 AGENDAR REUNIÃO — CALENDLY
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            O Calendly abre pré-preenchido com nome, e-mail e frota do gestor.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b">
        <span className="text-lg">{icon}</span>
        <h3 className={`font-bold ${color}`}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required ? "" : ""}
      </Label>
      {children}
    </div>
  );
}
