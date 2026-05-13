import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Fuel, 
  Building2, 
  User, 
  Smartphone, 
  MapPin, 
  Rocket, 
  Diamond, 
  Handshake, 
  Mail, 
  Camera, 
  CheckCircle2,
  Briefcase
} from "lucide-react";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const ESTABLISHMENT_TYPES = [
  "Posto de Combustível",
  "Oficina Mecânica",
  "Loja de Acessórios",
  "Auto Elétrica",
  "Centro Automotivo",
  "Lava Jato",
  "Outro"
];

export default function RedeNovo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // Tipo de Cadastro
  const [partnerType, setPartnerType] = useState<"diamante" | "estrategico">("diamante");

  // Campos Globais / Existentes
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [manager, setManager] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("MA");
  const [reward, setReward] = useState("0.50");

  // Novos Campos Condicionais
  const [email, setEmail] = useState("");
  const [ownerCpf, setOwnerCpf] = useState("");
  const [ownerRole, setOwnerRole] = useState("");
  const [establishmentType, setEstablishmentType] = useState("");
  const [createBusinessModel, setCreateBusinessModel] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mock de upload para demonstração
    if (photos.length < 3) {
      setPhotos([...photos, URL.createObjectURL(e.target.files![0])]);
      toast.success("Foto adicionada com sucesso!");
    } else {
      toast.error("Limite de 3 fotos atingido.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validações básicas
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (partnerType === "diamante" && photos.length === 0) {
      toast.error("Ao menos uma foto do PDV é obrigatória para Parceiros Diamante");
      return;
    }

    const phoneDigits = whatsapp.replace(/\D/g, "");
    if (phoneDigits.length !== 11) {
      toast.error("WhatsApp inválido! Digite o DDD + 9 + Número");
      return;
    }

    setBusy(true);

    // No mundo real, faríamos o upload das fotos aqui
    
    const { data, error } = await supabase
      .from("pdvs")
      .insert({
        user_id: user.id,
        short_code: "", 
        name: name.trim(),
        cnpj: cnpj.trim() || null,
        manager_name: manager.trim() || null,
        whatsapp: whatsapp.trim() || null,
        city: city.trim() || null,
        state: uf,
        reward_per_lead: Number(reward.replace(",", ".")) || 0.5,
        // Campos extras poderiam ser salvos em colunas novas ou JSONB
        metadata: {
          partner_type: partnerType,
          email: email.trim(),
          owner_cpf: ownerCpf.trim(),
          owner_role: ownerRole.trim(),
          establishment_type: establishmentType,
          create_business_model: createBusinessModel,
          photo_count: photos.length
        }
      })
      .select("id")
      .single();

    setBusy(false);

    if (error || !data) {
      toast.error(error?.message ?? "Erro ao cadastrar");
      return;
    }

    if (createBusinessModel) {
      toast.success("Modelo de Negócio disparado para o e-mail cadastrado!");
    }

    toast.success("Parceiro cadastrado com sucesso! 🎉");
    navigate("/rede");
  };

  return (
    <div className="pb-8 max-w-2xl mx-auto">
      {/* Header institucional */}
      <div className="bg-[#206de2] text-white -mx-4 px-4 pt-8 pb-10 rounded-b-[2rem] shadow-lg">
        <div className="flex items-center gap-4">
          <Button asChild size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full">
            <Link to="/rede"><ArrowLeft className="w-6 h-6" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Parceiro PDV</h1>
            <p className="text-sm opacity-90">Expanda sua rede de captura estratégica</p>
          </div>
        </div>
      </div>

      {/* Seletor de Tipo de Parceiro */}
      <div className="mt-[-2rem] px-2">
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setPartnerType("diamante")}
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 shadow-sm ${
              partnerType === "diamante" 
              ? "bg-white border-[#206de2] text-[#206de2] ring-4 ring-[#206de2]/10" 
              : "bg-white/80 border-transparent text-muted-foreground hover:bg-white"
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${partnerType === "diamante" ? "bg-[#206de2]/10" : "bg-muted"}`}>
              <Diamond className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm">Parceiro Diamante</span>
          </button>

          <button
            type="button"
            onClick={() => setPartnerType("estrategico")}
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 shadow-sm ${
              partnerType === "estrategico" 
              ? "bg-white border-[#206de2] text-[#206de2] ring-4 ring-[#206de2]/10" 
              : "bg-white/80 border-transparent text-muted-foreground hover:bg-white"
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${partnerType === "estrategico" ? "bg-[#206de2]/10" : "bg-muted"}`}>
              <Handshake className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm">Parceiro Estratégico</span>
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-6 px-1">
        
        {/* CAMPOS DINÂMICOS - OPÇÃO A: DIAMANTE */}
        {partnerType === "diamante" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[#206de2]">
                <Diamond className="w-5 h-5" />
                <h2 className="font-bold">Dados Diamante</h2>
              </div>

              <div className="grid gap-4">
                <Field icon={Building2} label="Nome do Estabelecimento *">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Posto Central LTDA" required />
                </Field>

                <Field icon={Building2} label="CNPJ *">
                  <Input 
                    value={cnpj} 
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "").slice(0, 14);
                      if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
                      else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})/, "$1.$2.$3/$4");
                      else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{3})/, "$1.$2.$3");
                      else if (v.length > 2) v = v.replace(/^(\d{2})(\d{3})/, "$1.$2");
                      setCnpj(v);
                    }} 
                    placeholder="00.000.000/0000-00" 
                    required 
                  />
                </Field>

                <Field icon={MapPin} label="Endereço Completo *">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Rua, Número, Bairro..." required />
                </Field>
              </div>
            </section>

            <section className="space-y-4">
              <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <Camera className="w-4 h-4" /> Fotos do PDV (Mínimo 1)
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-muted flex items-center justify-center relative overflow-hidden bg-muted/20">
                    {photos[i] ? (
                      <img src={photos[i]} className="w-full h-full object-cover" alt="PDV" />
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center">
                        <Plus className="w-6 h-6 text-muted-foreground" />
                        <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* CAMPOS DINÂMICOS - OPÇÃO B: ESTRATÉGICO */}
        {partnerType === "estrategico" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Handshake className="w-5 h-5" />
                <h2 className="font-bold">Dados Estratégicos 🤝</h2>
              </div>

              <div className="grid gap-4">
                <Field icon={Rocket} label="Nome Fantasia *">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Oficina do João" required />
                </Field>

                <Field icon={Mail} label="E-mail Corporativo *">
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="contato@empresa.com.br" 
                    required 
                  />
                </Field>

                <Field icon={MapPin} label="Endereço">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Endereço do local" />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field icon={User} label="Nome do Responsável *">
                    <Input value={manager} onChange={(e) => setManager(e.target.value)} placeholder="Nome completo" required />
                  </Field>
                  <Field icon={User} label="CPF Responsável">
                    <Input 
                      value={ownerCpf} 
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "").slice(0, 11);
                        if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                        else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
                        else if (v.length > 3) v = v.replace(/(\d{3})(\d{3})/, "$1.$2");
                        setOwnerCpf(v);
                      }} 
                      placeholder="000.000.000-00" 
                    />
                  </Field>
                </div>

                <Field icon={Briefcase} label="Cargo do Responsável">
                  <Input value={ownerRole} onChange={(e) => setOwnerRole(e.target.value)} placeholder="Ex: Proprietário, Gerente..." />
                </Field>
              </div>
            </section>

            <section className="space-y-4 pt-4 border-t border-border">
              <h2 className="font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-muted-foreground" /> Informações do PDV
              </h2>
              
              <div className="space-y-4">
                <div className="relative">
                  <Label className="absolute left-9 -top-2 px-1 bg-background text-[11px] text-muted-foreground z-10">Tipo de Estabelecimento</Label>
                  <div className="flex items-center border rounded-xl bg-background h-12 px-3">
                    <Building2 className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                    <Select value={establishmentType} onValueChange={setEstablishmentType}>
                      <SelectTrigger className="border-0 focus:ring-0 h-9 p-0 bg-transparent">
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTABLISHMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-muted/30 p-4 rounded-xl border border-dashed border-border transition-all hover:bg-muted/50">
                  <Checkbox 
                    id="business-model" 
                    checked={createBusinessModel} 
                    onCheckedChange={(checked) => setCreateBusinessModel(!!checked)} 
                  />
                  <label htmlFor="business-model" className="text-sm font-medium leading-none cursor-pointer">
                    Criar Modelo de Negócio (Envio Automático por E-mail)
                  </label>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white border rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Fotos do Local</p>
                    <p className="text-xs text-muted-foreground">{photos.length} fotos adicionadas</p>
                  </div>
                  <input type="file" id="photo-strategico" className="hidden" onChange={handlePhotoUpload} />
                  <Button asChild size="sm" variant="outline" className="rounded-lg h-8">
                    <label htmlFor="photo-strategico">Adicionar</label>
                  </Button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* RECOMPENSA E WHATSAPP (COMUNS) */}
        <section className="space-y-4 pt-6 border-t border-border">
          <h2 className="font-bold flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-muted-foreground" /> Configuração de Operação
          </h2>

          <div className="grid gap-4">
            <Field icon={Smartphone} label="WhatsApp para Alertas *">
              <Input
                value={whatsapp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                  let masked = val;
                  if (val.length > 2) masked = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                  if (val.length > 7) masked = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                  setWhatsapp(masked);
                }}
                placeholder="(98) 98462-9959"
                inputMode="tel"
                required
              />
            </Field>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Field icon={Fuel} label="Comissão por Lead (R$)">
                  <Input
                    value={reward}
                    onChange={(e) => setReward(e.target.value)}
                    placeholder="0.50"
                    inputMode="decimal"
                  />
                </Field>
              </div>
              <div className="relative">
                <Label className="absolute left-3 -top-2 px-1 bg-background text-[11px] text-muted-foreground z-10">UF</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        <Button
          type="submit"
          disabled={busy}
          className="w-full h-14 text-base font-bold gap-2 bg-[#206de2] hover:bg-[#206de2]/90 text-white rounded-2xl shadow-xl shadow-blue-500/20 mt-8"
        >
          {busy ? "Processando..." : (
            <>
              <Rocket className="w-5 h-5" />
              FINALIZAR CADASTRO E GERAR QR
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  );
}

function Field({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Label className="absolute left-9 -top-2 px-1 bg-background text-[11px] text-muted-foreground z-10 transition-all">
        {label}
      </Label>
      <div className="flex items-center border rounded-xl bg-background h-12 px-3 shadow-sm focus-within:ring-2 focus-within:ring-[#206de2]/20 focus-within:border-[#206de2] transition-all">
        <Icon className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
        <div className="flex-1 [&>*]:border-0 [&>*]:bg-transparent [&>*]:px-0 [&>*]:h-10 [&>*]:focus-visible:ring-0 [&>*]:text-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
