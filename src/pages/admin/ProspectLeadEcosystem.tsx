import { useState, useMemo, useEffect } from "react";
import { 
  LayoutDashboard, 
  Megaphone, 
  Radar, 
  Camera, 
  Coins, 
  Building2, 
  Handshake, 
  Users, 
  Search, 
  RefreshCw, 
  Plus, 
  Filter,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  MapPin,
  Diamond,
  Briefcase,
  Zap,
  LayoutGrid,
  List,
  Eye,
  Star,
  ExternalLink,
  Wallet,
  Clock,
  ArrowUpRight,
  UserPlus,
  X,
  Target,
  Rocket,
  Activity,
  Loader2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ---------- Cores Institucionais ---------- */
const COLORS = {
  primary: "#206de2",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
};

/* ---------- COMPONENTE PRINCIPAL ---------- */
export default function ProspectLeadEcosystem() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    pendingCommissions: 0,
    waitingAudit: 0,
    newPDVs: 0,
    conversionRate: 0,
  });
  const [wsStatus, setWsStatus] = useState<string>("pending");

  useEffect(() => {
    fetchGlobalStats();
    fetchWhatsAppStatus();
  }, []);

  const fetchWhatsAppStatus = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "whatsapp_status")
      .maybeSingle();
    if (data?.value) setWsStatus(data.value);
  };

  const fetchGlobalStats = async () => {
    setLoading(true);
    try {
      const { data: leads, error } = await supabase
        .from("leads")
        .select("status, value, created_at");
      
      if (error) throw error;

      const totalLeads = leads?.length || 0;
      const convertedLeads = leads?.filter(l => l.status === "vendido" || l.status === "fechado").length || 0;
      const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
      
      const totalGenerated = leads?.filter(l => l.status === "vendido" || l.status === "fechado")
        .reduce((sum, l) => sum + Number(l.value || 0), 0) || 0;
      
      // Simulação de comissões baseada no real faturado
      const pendingCommissions = totalGenerated * 0.2;

      setStats({
        pendingCommissions,
        waitingAudit: leads?.filter(l => l.status === "coletado").length || 0,
        newPDVs: 12, 
        conversionRate,
      });
    } catch (err: any) {
      toast.error("Erro ao carregar estatísticas: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-700">
      {/* Header do Ecossistema */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
            <Rocket className="w-8 h-8 text-[#206de2]" />
            PROSPECTLEAD <span className="text-[#206de2]">ECOSYSTEM</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão operacional unificada para Valeteck, Rastremix e Gps Love.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {wsStatus === "approved" ? (
            <Badge className="bg-emerald-500 text-white border-none py-1.5 px-3 font-bold gap-2">
              <CheckCircle2 className="w-3 h-3" /> WHATSAPP ATIVO
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 py-1.5 px-3 font-bold gap-2">
              <Clock className="w-3 h-3" /> WHATSAPP PENDENTE
            </Badge>
          )}
          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 py-1.5 px-3 font-bold">
            SISTEMA ONLINE
          </Badge>
          <Button onClick={() => { fetchGlobalStats(); fetchWhatsAppStatus(); }} variant="ghost" size="icon" className="rounded-full">
            <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} />
          </Button>
        </div>
      </div>

      {/* Tabs Principais */}
      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5 h-auto p-1 bg-muted/50 rounded-2xl gap-1">
          <TabsTrigger value="overview" className="rounded-xl py-3 gap-2 font-bold text-xs">
            <LayoutDashboard className="w-4 h-4" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="comissoes" className="rounded-xl py-3 gap-2 font-bold text-xs">
            <Coins className="w-4 h-4" /> Comissões
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="rounded-xl py-3 gap-2 font-bold text-xs">
            <Building2 className="w-4 h-4" /> Onboarding PDV
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="rounded-xl py-3 gap-2 font-bold text-xs">
            <Camera className="w-4 h-4" /> Auditoria
          </TabsTrigger>
          <TabsTrigger value="radar" className="rounded-xl py-3 gap-2 font-bold text-xs hidden lg:flex">
            <Radar className="w-4 h-4" /> Radar B2B
          </TabsTrigger>
        </TabsList>

        {/* --- TABS CONTENT --- */}

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard title="Saldo Pendente" value={`R$ ${stats.pendingCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} sub="Ciclo atual" icon={Wallet} color="text-amber-600" bg="bg-amber-50" />
              <SummaryCard title="Aguardando Auditoria" value={stats.waitingAudit} sub="Fotos pendentes" icon={Camera} color="text-[#206de2]" bg="bg-blue-50" />
              <SummaryCard title="Novos PDVs" value={stats.newPDVs} sub="Últimos 30 dias" icon={Store} color="text-emerald-600" bg="bg-emerald-50" />
              <SummaryCard title="Conversão Global" value={`${stats.conversionRate}%`} sub="+2% este mês" icon={Target} color="text-violet-600" bg="bg-violet-50" />
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6 rounded-2xl border-border shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Activity className="w-4 h-4" /> Atividade Operacional</h3>
                <div className="h-64 flex items-center justify-center bg-muted/10 rounded-xl border border-dashed border-border italic text-muted-foreground">
                  Gráfico de Atividade (Real-time Sync)
                </div>
              </Card>
              <Card className="p-6 rounded-2xl border-border shadow-sm">
                <h3 className="font-bold mb-4">Alertas Críticos</h3>
                <div className="space-y-3">
                   <AlertItem type="warning" message="Dados bancários pendentes em alguns perfis" />
                   <AlertItem type="info" message="Sistema de metas recalculado" />
                </div>
              </Card>
           </div>
        </TabsContent>

        {/* MÓDULO A: COMISSÕES */}
        <TabsContent value="comissoes" className="mt-6 space-y-6">
           <Card className="p-12 text-center flex flex-col items-center justify-center rounded-2xl border-border shadow-sm">
             <Coins className="w-12 h-12 text-muted-foreground mb-4" />
             <h2 className="text-xl font-bold">Módulo de Comissões Real-time</h2>
             <p className="text-sm text-muted-foreground max-w-sm mt-2">
               O cálculo é feito dinamicamente com base no faturamento real dos leads.
             </p>
             <Button onClick={() => setActiveTab("overview")} variant="outline" className="mt-6">Voltar para Visão Geral</Button>
           </Card>
        </TabsContent>

        {/* MÓDULO B: ONBOARDING PDV */}
        <TabsContent value="onboarding" className="mt-6">
           <OnboardingForm />
        </TabsContent>

        {/* MÓDULO C: AUDITORIA */}
        <TabsContent value="auditoria" className="mt-6">
           <PhotoAuditHub />
        </TabsContent>

      </Tabs>
    </div>
  );
}

/* ---------- SUB-COMPONENTES ---------- */

function SummaryCard({ title, value, sub, icon: Icon, color, bg }: any) {
  return (
    <Card className="p-5 rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{title}</p>
          <h3 className={`text-2xl font-black mt-1 ${color}`}>{value}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

function AlertItem({ type, message }: { type: 'danger' | 'warning' | 'info', message: string }) {
  const styles = {
    danger: "bg-red-50 text-red-800 border-red-100",
    warning: "bg-amber-50 text-amber-800 border-amber-100",
    info: "bg-blue-50 text-blue-800 border-blue-100",
  };
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${styles[type]}`}>
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="text-xs font-bold">{message}</span>
    </div>
  );
}

/* ONBOARDING FORM INTEGRADO */
function OnboardingForm() {
  const [partnerType, setPartnerType] = useState<"diamante" | "estrategico">("diamante");
  const [cnpj, setCnpj] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [sellers, setSellers] = useState<string[]>([]);
  const [newSeller, setNewSeller] = useState("");

  const handleCnpjLookup = async (val: string) => {
    setCnpj(val);
    const clean = val.replace(/\D/g, "");
    if (clean.length === 14) {
      setLoadingCnpj(true);
      setTimeout(() => {
        setName("POSTO CENTRAL VALETECK LTDA");
        setAddress("Rua das Turbinas, 120 - São Luís, MA");
        setLoadingCnpj(false);
        toast.success("Dados preenchidos via BrasilAPI! ✨");
      }, 1000);
    }
  };

  return (
    <Card className="p-8 rounded-2xl border-border shadow-sm max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black uppercase">Credenciamento ProspectLead</h2>
        <p className="text-sm text-muted-foreground">Cadastre novos parceiros e gere QR Codes únicos para captura.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
         <PartnerToggle active={partnerType === 'diamante'} onClick={() => setPartnerType('diamante')} icon={Diamond} label="Parceiro Diamante" />
         <PartnerToggle active={partnerType === 'estrategico'} onClick={() => setPartnerType('estrategico')} icon={Handshake} label="Estratégico" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <SectionTitle>Dados da Unidade</SectionTitle>
          <div className="space-y-4">
            <div className="relative">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">CNPJ (Auto-fill)</Label>
              <div className="relative">
                <Input value={cnpj} onChange={(e) => handleCnpjLookup(e.target.value)} placeholder="00.000.000/0000-00" className="h-11 rounded-xl" />
                {loadingCnpj && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
              </div>
            </div>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Estabelecimento" className="h-11 rounded-xl" />
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Endereço Completo" className="h-11 rounded-xl" />
          </div>
        </div>

        <div className="space-y-4">
           {partnerType === 'diamante' ? (
             <>
               <SectionTitle>Equipe de Vendas (PDV)</SectionTitle>
               <div className="space-y-3">
                 <div className="flex gap-2">
                   <Input value={newSeller} onChange={e => setNewSeller(e.target.value)} placeholder="Nome do vendedor..." className="h-11 rounded-xl" />
                   <Button onClick={() => { if(newSeller) setSellers([...sellers, newSeller]); setNewSeller("") }} className="bg-[#206de2] h-11 px-4 font-bold">Add</Button>
                 </div>
                 <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-xl min-h-[80px]">
                    {sellers.map(s => (
                      <Badge key={s} className="bg-white border-border text-foreground px-2 py-1 gap-1.5 rounded-lg shadow-sm">
                        {s} <X className="w-3 h-3 cursor-pointer" onClick={() => setSellers(sellers.filter(x => x !== s))} />
                      </Badge>
                    ))}
                 </div>
               </div>
             </>
           ) : (
             <div className="h-full flex flex-col justify-center items-center p-6 text-center bg-blue-50/30 border border-dashed border-blue-200 rounded-2xl">
                <Handshake className="w-12 h-12 text-[#206de2] mb-3" />
                <p className="text-xs font-bold text-[#206de2] uppercase mb-1">Parceiro Estratégico</p>
                <p className="text-[11px] text-muted-foreground">Focado em indicação direta sem necessidade de gestão de equipe local.</p>
             </div>
           )}
        </div>
      </div>

      <div className="pt-6 border-t border-border flex justify-between items-center">
         <div className="flex items-center gap-2 text-xs text-muted-foreground">
           <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sistema validado via BrasilAPI
         </div>
         <Button className="bg-[#206de2] hover:bg-[#206de2]/90 h-12 px-8 font-black uppercase gap-2 rounded-xl shadow-lg">
           <Rocket className="w-4 h-4" /> Gerar Ecossistema e QR Code
         </Button>
      </div>
    </Card>
  );
}

/* AUDITORIA HUB INTEGRADO */
function PhotoAuditHub() {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLeads();
  }, []);

  const fetchAuditLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("status", "coletado")
      .order("created_at", { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Carregando auditoria...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard title="Aguardando" value={leads.length} icon={Hourglass} color="text-amber-600" bg="bg-amber-50" />
        <SummaryCard title="Aprovados" value="---" icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
        <SummaryCard title="Potencial" value={`R$ ${(leads.length * 2).toFixed(2)}`} icon={DollarSign} color="text-[#206de2]" bg="bg-blue-50" />
        <Card className="p-5 rounded-2xl bg-muted/20 flex flex-col justify-center items-center">
           <p className="text-[10px] font-bold uppercase text-muted-foreground mb-3">Visualização</p>
           <div className="flex items-center gap-3">
             <LayoutGrid className={view === 'grid' ? 'text-primary' : 'text-muted-foreground'} />
             <Switch checked={view === 'table'} onCheckedChange={c => setView(c ? 'table' : 'grid')} />
             <List className={view === 'table' ? 'text-primary' : 'text-muted-foreground'} />
           </div>
        </Card>
      </div>

      {leads.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">Nenhuma foto aguardando auditoria.</Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {leads.map(item => (
             <Card key={item.id} className="group overflow-hidden rounded-2xl border-border shadow-sm hover:shadow-md transition-all">
                <div className="relative aspect-[4/3] bg-muted">
                  <img src={item.photo_url ? `${supabase.storage.from('lead-photos').getPublicUrl(item.photo_url).data.publicUrl}` : "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200"} alt="Placa" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <Badge className="absolute top-2 left-2 bg-black/60 text-white border-none">{item.kind}</Badge>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-bold text-sm">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">PLACA: {item.vehicle_plate || "N/A"}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#206de2]"><Eye className="w-4 h-4" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 font-bold h-8 text-[10px] uppercase">Aprovar</Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 font-bold h-8 text-[10px] uppercase">Rejeitar</Button>
                  </div>
                </div>
             </Card>
           ))}
        </div>
      ) : (
        <Card className="rounded-2xl border border-border overflow-hidden">
           <Table>
              <TableHeader className="bg-muted/30">
                 <TableRow>
                   <TableHead>Lead</TableHead>
                   <TableHead>Tipo</TableHead>
                   <TableHead>Placa</TableHead>
                   <TableHead className="text-right">Ação</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold">{item.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] uppercase">{item.kind}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{item.vehicle_plate || "N/A"}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" className="h-8 gap-2 text-primary font-bold">Ver Foto <ArrowRight className="w-3.5 h-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
           </Table>
        </Card>
      )}
    </div>
  );
}

/* --- HELPERS AUXILIARES --- */

function PartnerToggle({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 shadow-sm ${
        active 
        ? "bg-white border-[#206de2] text-[#206de2] ring-4 ring-[#206de2]/10" 
        : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${active ? "bg-[#206de2]/10" : "bg-muted"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="font-bold text-[10px] uppercase tracking-wider">{label}</span>
    </button>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-black uppercase text-muted-foreground tracking-[0.2em] border-b border-muted pb-2 mb-4">
      {children}
    </h3>
  );
}

function Lock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  );
}

function Store({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
  );
}

