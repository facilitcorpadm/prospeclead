import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Smartphone, 
  MapPin, 
  Rocket, 
  Diamond, 
  Handshake, 
  Mail, 
  Camera, 
  Plus, 
  X, 
  Fuel, 
  Briefcase, 
  CheckCircle2, 
  Home, 
  Target, 
  Users, 
  Calendar, 
  UserCheck, 
  Loader2,
  Lock
} from "lucide-react";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const ESTABLISHMENT_TYPES = [
  "Lava Jato",
  "Posto de Combustível",
  "Oficina Mecânica",
  "Auto Elétrica",
  "Centro Automotivo",
  "Loja de Acessórios",
  "Outros"
];

/* ---------- Hook de Busca CNPJ via BrasilAPI ---------- */
function useCNPJLookup() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const lookup = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      setData(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) throw new Error("CNPJ não encontrado");
      const result = await response.json();
      setData(result);
      toast.success("Dados do CNPJ importados com sucesso! ⚡");
    } catch (err) {
      setData(null);
      toast.error("Erro ao buscar CNPJ. Insira manualmente.");
    } finally {
      setLoading(false);
    }
  };

  return { lookup, loading, data };
}

export default function CadastroParceiroFinal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // Tipo de Cadastro (Diamante vs Estratégico)
  const [partnerType, setPartnerType] = useState<"diamante" | "estrategico">("diamante");

  // Hook de CNPJ
  const { lookup, loading: loadingCnpj, data: cnpjData } = useCNPJLookup();

  // Campos Globais & Condicionais
  const [cnpj, setCnpj] = useState("");
  const [name, setName] = useState("");
  const [manager, setManager] = useState(""); // Nome do Gerente Responsável (Novo campo obrigatório)
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("MA");
  const [reward, setReward] = useState("0.50");

  // Estratégico Exclusivos
  const [email, setEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerCpf, setOwnerCpf] = useState("");
  const [ownerRole, setOwnerRole] = useState("");
  const [establishmentType, setEstablishmentType] = useState("");
  const [createBusinessModel, setCreateBusinessModel] = useState(false);

  // Mídias
  const [photos, setPhotos] = useState<string[]>([]);

  // Gestão de Vendedores (Apenas Diamante)
  const [sellerName, setSellerName] = useState("");
  const [sellers, setSellers] = useState<string[]>([]);

  // Auto-fill CNPJ quando detecta 14 dígitos
  useEffect(() => {
    const clean = cnpj.replace(/\D/g, "");
    if (clean.length === 14) {
      lookup(clean);
    }
  }, [cnpj]);

  // Preencher campos após retorno da API
  useEffect(() => {
    if (cnpjData) {
      setName(cnpjData.razao_social || cnpjData.nome_fantasia || "");
      const fullAddress = `${cnpjData.logradouro || ""}, ${cnpjData.numero || ""} - ${cnpjData.bairro || ""}`;
      setAddress(fullAddress);
      setCity(cnpjData.municipio || "");
      setUf(cnpjData.uf || "MA");
    }
  }, [cnpjData]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileUrl = URL.createObjectURL(e.target.files[0]);
      setPhotos((prev) => [...prev, fileUrl]);
      toast.success("Foto capturada com sucesso! 📸");
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const addSeller = () => {
    if (!sellerName.trim()) return;
    if (sellers.includes(sellerName.trim())) {
      toast.error("Vendedor já cadastrado na lista.");
      return;
    }
    setSellers((prev) => [...prev, sellerName.trim()]);
    setSellerName("");
    toast.success("Vendedor adicionado! 👥");
  };

  const removeSeller = (name: string) => {
    setSellers((prev) => prev.filter((s) => s !== name));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (partnerType === "diamante") {
      if (!name.trim()) {
        toast.error("Nome do estabelecimento é obrigatório");
        return;
      }
      if (!manager.trim()) {
        toast.error("Nome do gerente responsável é obrigatório");
        return;
      }
      if (photos.length === 0) {
        toast.error("Pelo menos 1 foto do PDV é obrigatória para Parceiros Diamante");
        return;
      }
    } else {
      if (!name.trim()) {
        toast.error("Nome fantasia é obrigatório");
        return;
      }
      if (!email.trim()) {
        toast.error("E-mail corporativo é obrigatório");
        return;
      }
    }

    setBusy(true);

    const { data, error } = await supabase
      .from("pdvs")
      .insert({
        user_id: user.id,
        short_code: "", // preenchido via trigger
        name: name.trim(),
        cnpj: cnpj.trim() || null,
        manager_name: partnerType === "diamante" ? manager.trim() : ownerName.trim(),
        city: city.trim() || null,
        state: uf,
        reward_per_lead: Number(reward.replace(",", ".")) || 0.5,
        metadata: {
          partner_type: partnerType,
          email: email.trim(),
          owner_cpf: ownerCpf.trim(),
          owner_role: ownerRole.trim(),
          establishment_type: establishmentType,
          create_business_model: createBusinessModel,
          sellers: sellers,
          photo_count: photos.length,
          source: "CadastroParceiroFinal"
        }
      })
      .select("id")
      .single();

    setBusy(false);

    if (error || !data) {
      toast.error(error?.message ?? "Erro ao realizar cadastro.");
      return;
    }

    toast.success("Parceiro PDV credenciado e QR Code gerado! 🎉");
    navigate("/rede");
  };

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4">
      {/* Header Premium Azul Corporativo */}
      <div className="bg-gradient-to-r from-[#206de2] to-[#1d5ec4] text-white -mx-4 px-6 pt-8 pb-12 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
        <div className="flex items-center gap-4 relative z-10">
          <Button asChild size="icon" variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10">
            <Link to="/rede"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Rocket className="w-6 h-6 animate-pulse" /> NOVO PARCEIRO PDV
            </h1>
            <p className="text-xs opacity-90 mt-0.5">Credencie canais físicos e impulsione as conversões</p>
          </div>
        </div>
      </div>

      {/* Seletor de Perfil Elegante */}
      <div className="mt-[-2.5rem] relative z-10 px-2">
        <div className="grid grid-cols-2 gap-4 bg-white p-2 rounded-2xl shadow-lg border border-muted/50">
          <button
            type="button"
            onClick={() => setPartnerType("diamante")}
            className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
              partnerType === "diamante"
                ? "bg-[#206de2]/10 text-[#206de2] font-extrabold shadow-sm"
                : "text-muted-foreground hover:bg-muted/30"
            }`}
          >
            <Diamond className={`w-5 h-5 ${partnerType === "diamante" ? "stroke-[2.5px]" : ""}`} />
            <span className="text-xs uppercase tracking-wider">Parceiro Diamante</span>
          </button>

          <button
            type="button"
            onClick={() => setPartnerType("estrategico")}
            className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
              partnerType === "estrategico"
                ? "bg-[#206de2]/10 text-[#206de2] font-extrabold shadow-sm"
                : "text-muted-foreground hover:bg-muted/30"
            }`}
          >
            <Handshake className={`w-5 h-5 ${partnerType === "estrategico" ? "stroke-[2.5px]" : ""}`} />
            <span className="text-xs uppercase tracking-wider">Estratégico</span>
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-6">

        {/* -------------------- PERFIL DIAMANTE -------------------- */}
        {partnerType === "diamante" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Bloco 1: Dados da Empresa (Com Auto-fill) */}
            <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-muted pb-3 text-[#206de2]">
                <Building2 className="w-5 h-5" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider">Dados da Empresa (Diamante)</h2>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">CNPJ do Estabelecimento *</Label>
                  <div className="relative mt-1">
                    <Input
                      value={cnpj}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "").slice(0, 14);
                        if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
                        setCnpj(v);
                      }}
                      placeholder="00.000.000/0000-00"
                      className="h-12 rounded-xl pr-10"
                      required
                    />
                    {loadingCnpj && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#206de2]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirmação Visual Inteligente */}
                {cnpjData && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2.5 animate-in zoom-in-95 duration-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-emerald-800 uppercase">CNPJ Confirmado</p>
                      <p className="text-[11px] text-emerald-700">{cnpjData.razao_social}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nome do Estabelecimento *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Auto Posto Maiobão"
                    className="h-12 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nome do Gerente Responsável *</Label>
                  <Input
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    placeholder="Nome completo do gerente"
                    className="h-12 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Endereço Completo *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Preenchido automaticamente via CNPJ"
                      className="h-12 rounded-xl pl-9"
                      required
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Bloco 2: Gestão de Equipe (Vendedores) */}
            <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-muted pb-3 text-[#206de2]">
                <Users className="w-5 h-5" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider">Gestão de Vendedores (Equipe)</h2>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSeller())}
                    placeholder="Nome do vendedor..."
                    className="h-11 rounded-xl"
                  />
                  <Button type="button" onClick={addSeller} className="bg-[#206de2] hover:bg-[#206de2]/90 font-bold h-11 px-4 rounded-xl">
                    ADICIONAR
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-xl min-h-[60px] border border-dashed border-muted">
                  {sellers.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2">Nenhum vendedor adicionado ainda.</p>
                  ) : (
                    sellers.map((s) => (
                      <Badge key={s} className="bg-white border-border text-foreground px-2.5 py-1.5 gap-2 rounded-lg shadow-sm group">
                        <span className="font-bold text-xs">{s}</span>
                        <X className="w-3.5 h-3.5 cursor-pointer opacity-60 group-hover:opacity-100" onClick={() => removeSeller(s)} />
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </Card>

            {/* Bloco 3: Fotos do PDV (Trigger de Câmera) */}
            <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-muted pb-3 text-[#206de2]">
                <Camera className="w-5 h-5" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider">Fotos do PDV (Câmera Nativa)</h2>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-muted flex items-center justify-center relative overflow-hidden bg-muted/20 hover:bg-muted/30 transition-all">
                    {photos[i] ? (
                      <div className="relative w-full h-full">
                        <img src={photos[i]} className="w-full h-full object-cover" alt="PDV" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-600 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-1">
                        <Camera className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Câmera</span>
                        {/* Atributo capture="environment" força abertura da câmera no celular */}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handlePhotoCapture}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic">Mínimo de 1 foto obrigatória para o perfil Diamante.</p>
            </Card>
          </div>
        )}

        {/* -------------------- PERFIL ESTRATÉGICO -------------------- */}
        {partnerType === "estrategico" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-muted pb-3 text-emerald-600">
                <Handshake className="w-5 h-5" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider">Dados do Parceiro Estratégico</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nome Fantasia *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Consultoria Automotiva"
                    className="h-12 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">E-mail Corporativo *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parceiro@empresa.com.br"
                    className="h-12 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Endereço</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro..."
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Responsável *</Label>
                    <Input
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Nome completo"
                      className="h-12 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">CPF Responsável</Label>
                    <Input
                      value={ownerCpf}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "").slice(0, 11);
                        if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                        setOwnerCpf(v);
                      }}
                      placeholder="000.000.000-00"
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Cargo do Responsável</Label>
                  <Input
                    value={ownerRole}
                    onChange={(e) => setOwnerRole(e.target.value)}
                    placeholder="Ex: Diretor Comercial"
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-muted pb-3 text-emerald-600">
                <Building2 className="w-5 h-5" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider">Informações do PDV</h2>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Label className="absolute left-3 -top-2 px-1 bg-background text-[10px] font-bold uppercase text-muted-foreground z-10">Tipo de Estabelecimento</Label>
                  <Select value={establishmentType} onValueChange={setEstablishmentType}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTABLISHMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Modelo de Negócio Checkbox */}
                <div className="flex items-center space-x-3 bg-muted/20 p-4 rounded-xl border border-dashed border-muted">
                  <Checkbox
                    id="business-model"
                    checked={createBusinessModel}
                    onCheckedChange={(checked) => setCreateBusinessModel(!!checked)}
                  />
                  <label htmlFor="business-model" className="text-xs font-bold leading-none cursor-pointer">
                    Criar Modelo de Negócio (Envio Automático por E-mail)
                  </label>
                </div>

                {/* Fotos do Local com Câmera Nativa */}
                <div className="flex items-center gap-4 p-4 bg-white border border-muted/50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase">Fotos do Local</p>
                    <p className="text-[10px] text-muted-foreground">{photos.length} fotos tiradas</p>
                  </div>
                  <input
                    type="file"
                    id="photo-estrategico"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />
                  <Button asChild size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase rounded-lg">
                    <label htmlFor="photo-estrategico">Tirar Foto</label>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* -------------------- CONFIGURAÇÃO DA OPERAÇÃO -------------------- */}
        <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-muted pb-3 text-[#206de2]">
            <Fuel className="w-5 h-5" />
            <h2 className="font-extrabold text-sm uppercase tracking-wider">Parâmetros Operacionais</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Comissão por Lead (R$)</Label>
              <Input
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="0.50"
                className="h-12 rounded-xl"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">UF</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Ação Final Premium */}
        <Button
          type="submit"
          disabled={busy}
          className="w-full h-15 rounded-2xl bg-[#206de2] hover:bg-[#206de2]/90 text-white font-black tracking-wider text-sm gap-2.5 shadow-xl shadow-blue-500/20 py-6"
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              FINALIZAR CADASTRO E GERAR QR
            </>
          )}
        </Button>
      </form>

      {/* Navegação de Rodapé Estilo Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-muted px-4 py-3 flex justify-around items-center z-50 shadow-lg max-w-2xl mx-auto rounded-t-3xl">
        <FooterIcon Icon={Home} label="Início" />
        <FooterIcon Icon={Target} label="Leads" />
        <FooterIcon Icon={Calendar} label="Agenda" />
        <FooterIcon Icon={Users} label="Equipe" />
        <FooterIcon Icon={UserCheck} label="Perfil" />
      </div>
    </div>
  );
}

function FooterIcon({ Icon, label }: { Icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer text-muted-foreground hover:text-[#206de2] transition-colors">
      <Icon className="w-5 h-5" />
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}
