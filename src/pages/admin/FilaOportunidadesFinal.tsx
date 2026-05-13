import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  FileText, 
  Flame, 
  IceCorner, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Send,
  X
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { toast } from "sonner";

/* ---------- Tipos ---------- */
interface OpportunityLead {
  id: string;
  name: string;
  safra: "Mar/26" | "Fev/26" | "Jan/26" | "Dez/25";
  pdv: string;
  origin: "QR Code" | "Manual";
  funnel: "Contato Inicial" | "Apresentação" | "Reunião" | "Proposta" | "Fechado";
  temperature: "🔥 Quente" | "⚡ Morno" | "❄️ Frio";
  lastCampaignDays: number; 
  isContacted: boolean;
  status: "convertido" | "pendente";
}

export default function FilaOportunidadesFinal() {
  const [leads, setLeads] = useState<OpportunityLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSafra, setSelectedSafra] = useState<string>("all");
  const [selectedPdv, setSelectedPdv] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<"all" | "qr" | "manual">("all");
  const [hideContacted, setHideContacted] = useState(false);

  // Controle de Seleção em Lote
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  useEffect(() => {
    fetchLeads();

    // Inscrição em tempo real para novos leads
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          console.log("Novo lead recebido:", payload);
          toast.info("Novo lead detectado na fila! 🚀", {
            description: `Um novo lead acaba de entrar via ${payload.new.kind}.`,
            duration: 5000,
          });
          // Tocar som de notificação se necessário
          const audio = new Audio("/notification-sound.mp3");
          audio.play().catch(() => {}); // Silencioso se bloqueado pelo browser
          
          fetchLeads(); // Recarregar a lista
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Mapear dados do banco para o formato da UI
      const mappedLeads: OpportunityLead[] = (data || []).map(l => {
        const date = new Date(l.created_at);
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const safra = `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}` as any;
        
        return {
          id: l.id,
          name: l.name || "Sem Nome",
          safra: safra,
          pdv: l.company || "Manual",
          origin: l.kind === "qr" ? "QR Code" : "Manual",
          funnel: l.status === "vendido" ? "Fechado" : 
                  l.status === "coletado" ? "Apresentação" : "Contato Inicial",
          temperature: l.status === "vendido" ? "🔥 Quente" : "⚡ Morno",
          lastCampaignDays: Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)),
          isContacted: l.status !== "pendente",
          status: l.status === "vendido" ? "convertido" : "pendente"
        };
      });

      setLeads(mappedLeads);
    } catch (err: any) {
      toast.error("Erro ao carregar fila: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLeads();
    toast.success("Fila de oportunidades sincronizada! ⚡");
  };

  /* ---------- COMPLEMENTO A: Análise de Desempenho por Origem ---------- */
  const performanceStats = useMemo(() => {
    const qrLeads = leads.filter(l => l.origin === "QR Code");
    const manualLeads = leads.filter(l => l.origin === "Manual");

    const qrConversions = qrLeads.filter(l => l.status === "convertido").length;
    const manualConversions = manualLeads.filter(l => l.status === "convertido").length;

    const qrRate = qrLeads.length > 0 ? Math.round((qrConversions / qrLeads.length) * 100) : 0;
    const manualRate = manualLeads.length > 0 ? Math.round((manualConversions / manualLeads.length) * 100) : 0;

    return { qrRate, manualRate };
  }, [leads]);

  /* ---------- COMPLEMENTO C: Lead Scoring Dinâmico (Priorização) ---------- */
  const getLeadScore = (lead: OpportunityLead) => {
    let score = 0;
    if (lead.funnel === "Fechado") score += 100;
    if (lead.funnel === "Proposta") score += 50;
    if (lead.temperature === "🔥 Quente") score += 50;
    if (lead.temperature === "⚡ Morno") score += 20;
    return score;
  };

  // Filtragem e Ordenação Inteligente
  const filteredAndSortedLeads = useMemo(() => {
    return leads
      .filter((l) => {
        const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.pdv.toLowerCase().includes(search.toLowerCase());
        const matchesSafra = selectedSafra === "all" || l.safra === selectedSafra;
        const matchesPdv = selectedPdv === "all" || l.pdv === selectedPdv;
        const matchesOrigin = 
          originFilter === "all" || 
          (originFilter === "qr" && l.origin === "QR Code") || 
          (originFilter === "manual" && l.origin === "Manual");
        const matchesContacted = !hideContacted || !l.isContacted;

        return matchesSearch && matchesSafra && matchesPdv && matchesOrigin && matchesContacted;
      })
      .sort((a, b) => getLeadScore(b) - getLeadScore(a));
  }, [leads, search, selectedSafra, selectedPdv, originFilter, hideContacted]);

  // Estatísticas das Safras
  const safrasData = useMemo(() => {
    const months = Array.from(new Set(leads.map(l => l.safra))).sort();
    return months.map(safra => {
      const safraLeads = leads.filter(l => l.safra === safra);
      const total = safraLeads.length;
      const ready = safraLeads.filter(l => l.funnel !== "Contato Inicial").length;
      const converted = safraLeads.filter(l => l.status === "convertido").length;
      const progress = total > 0 ? Math.round((converted / total) * 100) : 0;

      return { safra, total, ready, converted, progress };
    });
  }, [leads]);

  // Handlers para Seleção em Lote
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredAndSortedLeads.map(l => l.id);
      setSelectedLeadIds(allIds);
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectLead = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(prev => [...prev, id]);
    } else {
      setSelectedLeadIds(prev => prev.filter(item => item !== id));
    }
  };

  const selectedSagasSet = useMemo(() => {
    const activeLeads = leads.filter(l => selectedLeadIds.includes(l.id));
    return Array.from(new Set(activeLeads.map(l => l.safra)));
  }, [selectedLeadIds, leads]);

  const percentageOfQueueSelected = useMemo(() => {
    if (leads.length === 0) return 0;
    return Math.round((selectedLeadIds.length / leads.length) * 100);
  }, [selectedLeadIds, leads]);

  const handleSendToCampaignMotor = () => {
    toast.success(`Sucesso! ${selectedLeadIds.length} leads enviados para o Motor de Campanhas 🚀`);
    setSelectedLeadIds([]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-36">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            FILA DE OPORTUNIDADES PDV
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gestão operacional e faturamento para Valeteck e Rastremix</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="rounded-xl gap-2 h-10 border-[#206de2] text-[#206de2] font-bold">
            <Link to="/leads">
              Painel Leads PDV <ExternalLink className="w-4 h-4" />
            </Link>
          </Button>
          <Button onClick={handleRefresh} variant="ghost" size="icon" className="h-10 w-10 bg-muted/30 hover:bg-muted/50 rounded-xl">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Cards de Safra */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {safrasData.map(s => (
          <Card key={s.safra} className="p-5 rounded-2xl border-border shadow-sm bg-card hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#206de2]/5 rounded-full blur-xl" />
            <div className="flex justify-between items-start mb-3">
              <Badge className="bg-[#206de2]/10 text-[#206de2] hover:bg-[#206de2]/20 font-bold px-2.5 py-0.5 rounded-lg text-xs">{s.safra}</Badge>
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Métrica Safra</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center border-b pb-3 mb-3">
              <div>
                <p className="text-[9px] uppercase font-bold text-muted-foreground">Total</p>
                <p className="text-lg font-black text-foreground mt-0.5">{s.total}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-muted-foreground">Prontos</p>
                <p className="text-lg font-black text-amber-600 mt-0.5">{s.ready}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-muted-foreground">Convert.</p>
                <p className="text-lg font-black text-emerald-600 mt-0.5">{s.converted}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                <span>Taxa de Conversão</span>
                <span className="text-emerald-600">{s.progress}%</span>
              </div>
              <Progress value={s.progress} className="h-1.5 bg-muted rounded-full" />
            </div>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="p-5 rounded-2xl border-border shadow-sm space-y-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente ou PDV..." 
              className="h-11 rounded-xl pl-9"
            />
          </div>

          <Select value={selectedSafra} onValueChange={setSelectedSafra}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Filtrar por Safra" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Safras</SelectItem>
              <SelectItem value="Mar/26">Março/26</SelectItem>
              <SelectItem value="Fev/26">Fevereiro/26</SelectItem>
              <SelectItem value="Jan/26">Janeiro/26</SelectItem>
              <SelectItem value="Dez/25">Dezembro/25</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPdv} onValueChange={setSelectedPdv}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Filtrar por PDV" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os PDVs</SelectItem>
              <SelectItem value="Posto Shell Renascença">Posto Shell Renascença</SelectItem>
              <SelectItem value="Auto Mecânica Centro">Auto Mecânica Centro</SelectItem>
              <SelectItem value="Lava Jato Cohama">Lava Jato Cohama</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border border-muted/50 rounded-xl">
            <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              Ocultar Contatados
              {selectedLeadIds.length > 0 && (
                <Badge className="bg-[#206de2] hover:bg-[#206de2]/90 text-white border-none h-5 text-[10px] font-bold px-1.5 py-0 rounded-full">
                  {selectedLeadIds.length} sel.
                </Badge>
              )}
            </span>
            <Switch checked={hideContacted} onCheckedChange={setHideContacted} />
          </div>
        </div>

        <div className="flex gap-2 border-t pt-4">
          <Button 
            onClick={() => setOriginFilter("all")} 
            variant={originFilter === "all" ? "default" : "outline"} 
            className="h-9 px-4 rounded-lg text-xs font-bold bg-[#206de2]"
          >
            Todos os Leads
          </Button>
          <Button 
            onClick={() => setOriginFilter("qr")} 
            variant={originFilter === "qr" ? "default" : "outline"} 
            className={`h-9 px-4 rounded-lg text-xs font-bold ${originFilter === "qr" ? "bg-[#206de2]" : ""}`}
          >
            Origem: QR Code
          </Button>
          <Button 
            onClick={() => setOriginFilter("manual")} 
            variant={originFilter === "manual" ? "default" : "outline"} 
            className={`h-9 px-4 rounded-lg text-xs font-bold ${originFilter === "manual" ? "bg-[#206de2]" : ""}`}
          >
            Origem: Manual
          </Button>
        </div>
      </Card>

      {/* Tabela com Checkbox e Seleção */}
      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-white flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Fila de Oportunidades Selecionável
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Use os checkboxes para enviar contatos selecionados em lote para o motor de campanhas.</p>
          </div>
          {selectedLeadIds.length > 0 && (
            <Badge className="bg-[#206de2]/10 text-[#206de2] hover:bg-[#206de2]/20 border-none font-black text-xs py-1 px-3 rounded-lg">
              {selectedLeadIds.length} Selecionados
            </Badge>
          )}
        </div>

        <div className="overflow-x-auto">
          <TooltipProvider>
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-12 pl-6">
                    <Checkbox 
                      checked={selectedLeadIds.length === filteredAndSortedLeads.length && filteredAndSortedLeads.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Safra</TableHead>
                  <TableHead>PDV Parceiro</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Funil</TableHead>
                  <TableHead>Temperatura</TableHead>
                  <TableHead>Última Campanha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-12">
                      Nenhum lead encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedLeads.map((lead) => {
                    const isHighPriority = getLeadScore(lead) >= 80;
                    const needsReengagement = (lead.safra === "Dez/25" || lead.safra === "Jan/26") && lead.lastCampaignDays > 15;
                    const isSelected = selectedLeadIds.includes(lead.id);

                    return (
                      <TableRow 
                        key={lead.id} 
                        className={`transition-all hover:bg-muted/10 relative ${
                          isHighPriority ? "border-l-4 border-l-[#206de2]" : ""
                        } ${isSelected ? "bg-[#206de2]/5" : ""}`}
                      >
                        <TableCell className="pl-6">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                          />
                        </TableCell>

                        <TableCell className="font-bold">
                          <div className="flex items-center gap-2">
                            <span>{lead.name}</span>
                            {isHighPriority && (
                              <Badge className="bg-[#206de2]/10 text-[#206de2] border-none text-[9px] font-black uppercase tracking-wider h-4">
                                Alta Fila
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold">{lead.safra}</Badge>
                        </TableCell>
                        
                        <TableCell className="text-xs font-semibold text-muted-foreground">{lead.pdv}</TableCell>
                        
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors">
                                <span className="text-sm">
                                  {lead.origin === "QR Code" ? "📱" : "✍️"}
                                </span>
                                <span className="text-xs font-bold text-muted-foreground">{lead.origin}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-card border border-border p-3 rounded-xl shadow-lg">
                              <p className="text-xs font-bold uppercase mb-1">Métrica de Conversão</p>
                              <p className="text-[10px] text-muted-foreground">
                                Leads do {lead.origin} possuem taxa de faturamento média de:{" "}
                                <span className="font-black text-emerald-600">
                                  {lead.origin === "QR Code" ? performanceStats.qrRate : performanceStats.manualRate}%
                                </span>
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>

                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] font-bold rounded-lg bg-indigo-50 text-indigo-700">{lead.funnel}</Badge>
                        </TableCell>

                        <TableCell className="font-bold text-xs">{lead.temperature}</TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-semibold">
                              {lead.lastCampaignDays} dias atrás
                            </span>
                            {needsReengagement && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded-lg text-[9px] font-extrabold flex items-center gap-1 cursor-pointer">
                                    <AlertCircle className="w-3 h-3 text-rose-600" /> ATENÇÃO
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="bg-card border border-border p-3 rounded-xl shadow-lg">
                                  <p className="text-xs font-bold text-rose-800">Régua de Reengajamento</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Leads antigos sem faturamento nos últimos 15 dias.</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      </Card>

      {/* Barra de Ação Flutuante (Action Bar) */}
      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-950 text-white rounded-2xl shadow-2xl px-6 py-4 flex flex-col gap-3 w-[92%] max-w-2xl border border-white/10 animate-in slide-in-from-bottom-8 duration-300 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black tracking-wider uppercase text-[#206de2]">{selectedLeadIds.length} Leads Selecionados</span>
              <div className="flex gap-1.5">
                {selectedSagasSet.map(safra => (
                  <Badge key={safra} className="bg-white/10 text-white border-none text-[9px] font-extrabold">
                    {safra}
                  </Badge>
                ))}
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedLeadIds([])} 
              className="text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <button 
              onClick={() => setSelectedLeadIds([])} 
              className="text-xs font-bold text-white/60 hover:text-white uppercase transition-colors"
            >
              Limpar seleção
            </button>
            <Button 
              onClick={handleSendToCampaignMotor}
              className="bg-[#206de2] hover:bg-[#206de2]/90 text-white font-black text-xs uppercase tracking-wider gap-2 rounded-xl py-5 px-6 shadow-lg"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar para Motor de Campanhas
            </Button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[8px] font-bold text-white/50 uppercase tracking-widest">
              <span>Fila Selecionada</span>
              <span>{percentageOfQueueSelected}%</span>
            </div>
            <Progress value={percentageOfQueueSelected} className="h-1 bg-white/10 rounded-full [&>*]:bg-[#206de2]" />
          </div>
        </div>
      )}
    </div>
  );
}
