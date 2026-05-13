import { useState } from "react";
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
  FileText,
  BadgePercent,
  HelpCircle
} from "lucide-react";

// Lista de todas as 27 Unidades Federativas do Brasil
const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

// Tipos de estabelecimentos para parceiro estratégico
const ESTABLISHMENT_TYPES = [
  "Lava Jato",
  "Posto de Combustível",
  "Oficina Mecânica",
  "Auto Elétrica",
  "Centro Automotivo",
  "Loja de Acessórios",
  "Outro"
];

export default function CadastroPDVCompleto() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // Tipo de cadastro (Diamante ou Estratégico)
  const [partnerType, setPartnerType] = useState<"diamante" | "estrategico">("diamante");

  // Estados do Formulário
  const [cnpj, setCnpj] = useState("");
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cnpjConfirmed, setCnpjConfirmed] = useState(false);
  
  // Dados preenchidos por Auto-fill ou manualmente
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [manager, setManager] = useState(""); // Gerente Responsável (Obrigatório)
  const [address, setAddress] = useState("");
  const [bairro, setBairro] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("MA");
  const [emailApi, setEmailApi] = useState("");
  const [phoneApi, setPhoneApi] = useState("");
  const [reward, setReward] = useState("0.50");

  // Campos Exclusivos - Parceiro Estratégico
  const [emailEstrategico, setEmailEstrategico] = useState("");
  const [ownerCpf, setOwnerCpf] = useState("");
  const [ownerRole, setOwnerRole] = useState("");
  const [establishmentType, setEstablishmentType] = useState("");
  const [createBusinessModel, setCreateBusinessModel] = useState(false);

  // Mídias e Fotos do Hardware Nativo (Câmera)
  const [photos, setPhotos] = useState<string[]>([]);

  // Gestão Dinâmica de Vendedores (Tags/Chips)
  const [sellerName, setSellerName] = useState("");
  const [sellers, setSellers] = useState<string[]>([]);

  /**
   * Aplica máscara de CNPJ (00.000.000/0000-00) em tempo real
   */
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 14);
    if (value.length > 12) value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    else if (value.length > 8) value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})/, "$1.$2.$3/$4");
    else if (value.length > 5) value = value.replace(/^(\d{2})(\d{3})(\d{3})/, "$1.$2.$3");
    else if (value.length > 2) value = value.replace(/^(\d{2})(\d{3})/, "$1.$2");
    setCnpj(value);
    setCnpjConfirmed(false);
  };

  /**
   * Realiza a consulta na BrasilAPI ao sair do campo (Blur)
   * Apenas dispara se o CNPJ tiver os 14 dígitos numéricos necessários.
   */
  const handleCnpjBlur = async () => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return;

    setLoadingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) throw new Error("CNPJ não encontrado");
      const data = await response.json();

      // Auto-fill inteligente de todos os campos retornados
      setRazaoSocial(data.razao_social || "");
      setNomeFantasia(data.nome_fantasia || data.razao_social || "");
      
      const fullAddress = `${data.logradouro || ""}, ${data.numero || ""}`;
      setAddress(fullAddress);
      setBairro(data.bairro || "");
      setCity(data.municipio || "");
      setUf(data.uf || "MA");
      setEmailApi(data.email || "");
      setPhoneApi(data.ddd_telefone_1 || "");
      
      setCnpjConfirmed(true);
      toast.success("Dados da empresa integrados com sucesso! ⚡");
    } catch (err) {
      toast.error("CNPJ não encontrado ou falha na API. Verifique ou preencha manualmente.");
    } finally {
      setLoadingCnpj(false);
    }
  };

  /**
   * Aciona a captura de mídia nativa usando a câmera do dispositivo
   */
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileUrl = URL.createObjectURL(e.target.files[0]);
      setPhotos((prev) => [...prev, fileUrl]);
      toast.success("Foto capturada do hardware nativo! 📸");
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Adiciona vendedor à listagem em formato de tags/chips
   */
  const addSeller = () => {
    if (!sellerName.trim()) return;
    if (sellers.includes(sellerName.trim())) {
      toast.underline?.("Vendedor já adicionado.");
      toast.error("Vendedor já está cadastrado.");
      return;
    }
    setSellers((prev) => [...prev, sellerName.trim()]);
    setSellerName("");
    toast.success("Vendedor vinculado ao PDV! 👥");
  };

  const removeSeller = (name: string) => {
    setSellers((prev) => prev.filter((s) => s !== name));
  };

  /**
   * Submete o credenciamento completo para a base de dados
   */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (partnerType === "diamante") {
      if (!razaoSocial.trim()) {
        toast.error("Razão Social é obrigatória");
        return;
      }
      if (!manager.trim()) {
        toast.error("Nome do gerente responsável é obrigatório");
        return;
      }
      if (photos.length === 0) {
        toast.error("A primeira foto do PDV é obrigatória.");
        return;
      }
    } else {
      if (!nomeFantasia.trim()) {
        toast.error("Nome Fantasia é obrigatório");
        return;
      }
      if (!emailEstrategico.trim()) {
        toast.error("E-mail corporativo é obrigatório");
        return;
      }
    }

    setBusy(true);

    const { data, error } = await supabase
      .from("pdvs")
      .insert({
        user_id: user.id,
        short_code: "", // preenchido via trigger automatico
        name: partnerType === "diamante" ? razaoSocial.trim() : nomeFantasia.trim(),
        cnpj: cnpj.trim() || null,
        manager_name: partnerType === "diamante" ? manager.trim() : ownerName.trim(),
        city: city.trim() || null,
        state: uf,
        reward_per_lead: Number(reward.replace(",", ".")) || 0.5,
        metadata: {
          partner_type: partnerType,
          nome_fantasia: nomeFantasia,
          email: partnerType === "diamante" ? emailApi : emailEstrategico,
          phone: phoneApi,
          owner_cpf: ownerCpf,
          owner_role: ownerRole,
          establishment_type: establishmentType,
          create_business_model: createBusinessModel,
          sellers: sellers,
          photos_count: photos.length,
          version: "CadastroPDVCompleto"
        }
      })
      .select("id")
      .single();

    setBusy(false);

    if (error || !data) {
      toast.error(error?.message ?? "Erro ao realizar credenciamento.");
      return;
    }

    toast.success("Credenciamento finalizado e QR Code ativo! 🎉");
    navigate("/rede");
  };

  const [ownerName, setOwnerName] = useState("");

  return (
    <div className="pb-28 max-w-2xl mx-auto px-4">
      {/* Header Corporativo Premium */}
      <div className="bg-gradient-to-r from-[#206de2] to-[#164ea3] text-white -mx-4 px-6 pt-8 pb-14 rounded-b-[2.5rem] shadow-lg relative">
        <div className="flex items-center gap-4">
          <Button asChild size="icon" variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10">
            <Link to="/rede"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Rocket className="w-6 h-6" /> NOVO PARCEIRO PDV
            </h1>
            <p className="text-xs opacity-90 mt-0.5">Ativação operacional com automação de cadastro</p>
          </div>
        </div>
      </div>

      {/* Seletor de Perfil Integrado */}
      <div className="mt-[-2.5rem] relative z-10 px-2">
        <div className="grid grid-cols-2 gap-4 bg-white p-2 rounded-2xl shadow-md border border-muted/50">
          <button
            type="button"
            onClick={() => setPartnerType("diamante")}
            className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
              partnerType === "diamante"
                ? "bg-[#206de2]/10 text-[#206de2] font-black shadow-sm"
                : "text-muted-foreground hover:bg-muted/30"
            }`}
          >
            <Diamond className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider">Parceiro Diamante</span>
          </button>

          <button
            type="button"
            onClick={() => setPartnerType("estrategico")}
            className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
              partnerType === "estrategico"
                ? "bg-[#206de2]/10 text-[#206de2] font-black shadow-sm"
                : "text-muted-foreground hover:bg-muted/30"
            }`}
          >
            <Handshake className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider">Estratégico</span>
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-6">

        {/* -------------------- BLOCOS PARCEIRO DIAMANTE -------------------- */}
        {partnerType === "diamante" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Bloco A: Dados da Empresa & Gestão */}
            <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-muted pb-3 text-[#206de2]">
                <Building2 className="w-5 h-5" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider">Dados da Empresa & Gestão</h2>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">CNPJ (Blur Trigger) *</Label>
                  <div className="relative mt-1">
                    <Input
                      value={cnpj}
                      onChange={handleCnpjChange}
                      onBlur={handleCnpjBlur}
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

                {/* Confirmação Visual do CNPJ */}
                {cnpjConfirmed && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2.5 animate-in slide-in-from-top-1 duration-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-emerald-800 uppercase">Nome da Empresa Confirmado</p>
                      <p className="text-xs text-emerald-700 font-bold">{razaoSocial}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Razão Social *</Label>
                  <Input
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    placeholder="Razão Social"
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Endereço Completo</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Bairro</Label>
                    <Input value={bairro} onChange={(e) => setBairro(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Cidade</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">E-mail da Empresa</Label>
                    <Input value={emailApi} onChange={(e) => setEmailApi(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Gestão Dinâmica de Vendedores */}
            <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-muted pb-3 text-[#206de2]">
                <Users className="w-5 h-5" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider">Gestão de Vendedores (Chips)</h2>
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
                  <Button type="button" onClick={addSeller} className="bg-[#206de2] hover:bg-[#206de2]/90 h-11 px-4 rounded-xl font-bold">
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-xl min-h-[60px] border border-dashed border-muted">
                  {sellers.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2">Nenhum vendedor adicionado.</p>
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

            {/* Bloco B: Bloco de Negociação (Novo) */}
            <Card className="p-6 rounded-2xl border border-[#206de2]/30 bg-[#206de2]/5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#206de2]/20 pb-3 text-[#206de2]">
                <BadgePercent className="w-5 h-5" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider">Parâmetros de Negociação</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white border border-muted rounded-xl">
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Tier 1</p>
                  <p className="text-lg font-black text-[#206de2] mt-1">R$ 0,25</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Até 30 Leads captados</p>
                </div>

                <div className="p-3 bg-white border border-muted rounded-xl">
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Tier 2</p>
                  <p className="text-lg font-black text-emerald-600 mt-1">R$ 0,50</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">De 0 a 25 Leads ativos</p>
                </div>
              </div>

              <div className="p-3 bg-white/50 border border-[#206de2]/10 rounded-xl flex gap-2.5">
                <FileText className="w-5 h-5 text-[#206de2] shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Regra de Faturamento</p>
                  <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                    O pagamento é realizado no <span className="text-[#206de2] font-black">20º dia útil</span> do mês subsequente.
                  </p>
                </div>
              </div>
            </Card>

            {/* Bloco C: Captura de Fotos (Hardware Nativo) */}
            <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-muted pb-3 text-[#206de2]">
                <Camera className="w-5 h-5" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider">Captura de Fotos (Fachada/PDV)</h2>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-muted flex items-center justify-center relative overflow-hidden bg-muted/20">
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
              <p className="text-[10px] text-muted-foreground italic">A primeira foto do estabelecimento é obrigatória.</p>
            </Card>
          </div>
        )}

        {/* -------------------- PERFIL PARCEIRO ESTRATÉGICO -------------------- */}
        {partnerType === "estrategico" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-muted pb-3 text-emerald-600">
                <Handshake className="w-5 h-5" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider">Identificação Estratégica</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nome Fantasia *</Label>
                  <Input
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    placeholder="Ex: Consultoria de Negócios"
                    className="h-12 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">E-mail Corporativo *</Label>
                  <Input
                    type="email"
                    value={emailEstrategico}
                    onChange={(e) => setEmailEstrategico(e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className="h-12 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Endereço</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Logradouro, número..."
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nome do Responsável *</Label>
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
                    placeholder="Cargo do responsável"
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
                    id="business-model-final"
                    checked={createBusinessModel}
                    onCheckedChange={(checked) => setCreateBusinessModel(!!checked)}
                  />
                  <label htmlFor="business-model-final" className="text-xs font-bold leading-none cursor-pointer">
                    Criar Modelo de Negócio (Envio Automático por E-mail)
                  </label>
                </div>

                {/* Fotos do Local */}
                <div className="flex items-center gap-4 p-4 bg-white border rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase">Fotos do Local</p>
                    <p className="text-[10px] text-muted-foreground">{photos.length} fotos registradas</p>
                  </div>
                  <input
                    type="file"
                    id="photo-final-estrategico"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />
                  <Button asChild size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase rounded-lg">
                    <label htmlFor="photo-final-estrategico">Capturar Foto</label>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* -------------------- PARÂMETROS OPERACIONAIS -------------------- */}
        <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-muted pb-3 text-[#206de2]">
            <Fuel className="w-5 h-5" />
            <h2 className="font-extrabold text-sm uppercase tracking-wider">Configuração de Operação</h2>
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

        {/* Ação Final */}
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

      {/* Navegação de Rodapé Estilo App Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-muted px-4 py-3.5 flex justify-around items-center z-50 shadow-lg max-w-2xl mx-auto rounded-t-3xl">
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
    <div className="flex flex-col items-center gap-1 cursor-pointer text-muted-foreground hover:text-[#206de2] transition-all">
      <Icon className="w-5 h-5" />
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}
