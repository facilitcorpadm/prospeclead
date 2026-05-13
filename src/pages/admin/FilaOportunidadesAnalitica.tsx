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
  Info
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  lastCampaignDays: number; // Dias desde a última campanha
  isContacted: boolean;
  status: "convertido" | "pendente";
}

// Dados de exemplo conforme estrutura do ProspectLead
const INITIAL_LEADS: OpportunityLead[] = [
  { id: "1", name: "Guilherme Alencar", safra: "Mar/26", pdv: "Posto Shell Renascença", origin: "QR Code", funnel: "Proposta", temperature: "🔥 Quente", lastCampaignDays: 4, isContacted: true, status: "convertido" },
  { id: "2", name: "Carlos Henrique Araujo", safra: "Mar/26", pdv: "Auto Mecânica Centro", origin: "QR Code", funnel: "Reunião", temperature: "🔥 Quente", lastCampaignDays: 16, isContacted: false, status: "pendente" },
  { id: "3", name: "Mariana Vasconcelos", safra: "Fev/26", pdv: "Lava Jato Cohama", origin: "Manual", funnel: "Proposta", temperature: "🔥 Quente", lastCampaignDays: 2, isContacted: false, status: "pendente" },
  { id: "4", name: "Felipe Eduardo Silva", safra: "Jan/26", pdv: "Posto Shell Renascença", origin: "QR Code", funnel: "Contato Inicial", temperature: "⚡ Morno", lastCampaignDays: 21, isContacted: false, status: "pendente" },
  { id: "5", name: "Juliana Mendes Brito", safra: "Dez/25", pdv: "Auto Mecânica Centro", origin: "Manual", funnel: "Apresentação", temperature: "❄️ Frio", lastCampaignDays: 35, isContacted: true, status: "convertido" },
  { id: "6", name: "Beatriz Nogueira", safra: "Mar/26", pdv: "Lava Jato Cohama", origin: "QR Code", funnel: "Proposta", temperature: "🔥 Quente", lastCampaignDays: 1, isContacted: false, status: "pendente" }
];

export default function FilaOportunidadesAnalitica() {
  const [leads, setLeads] = useState<OpportunityLead[]>(INITIAL_LEADS);
  const [search, setSearch] = useState("");
  const [selectedSafra, setSelectedSafra] = useState<string>("all");
  const [selectedPdv, setSelectedPdv] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<"all" | "qr" | "manual">("all");
  const [hideContacted, setHideContacted] = useState(false);

  // Recarrega dados com feedback do usuário
  const handleRefresh = () => {
    toast.success("Fila de oportunidades sincronizada e atualizada! ⚡");
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
    if (lead.funnel === "Proposta") score += 50;
    if (lead.funnel === "Reunião") score += 30;
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
      .sort((a, b) => {
        // Leads com maior pontuação aparecem no topo da lista automaticamente
        return getLeadScore(b) - getLeadScore(a);
      });
  }, [leads, search, selectedSafra, selectedPdv, originFilter, hideContacted]);

  // Estatísticas das Safras de Exemplo
  const safrasData = useMemo(() => {
    const list = ["Mar/26", "Fev/26", "Jan/26", "Dez/25"] as const;
    return list.map(safra => {
      const safraLeads = leads.filter(l => l.safra === safra);
      const total = safraLeads.length;
      const ready = safraLeads.filter(l => l.funnel !== "Contato Inicial").length;
      const converted = safraLeads.filter(l => l.status === "convertido").length;
      const progress = total > 0 ? Math.round((converted / total) * 100) : 0;

      return { safra, total, ready, converted, progress };
    });
  }, [leads]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Fila Oportunidades */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            FILA DE OPORTUNIDADES PDV
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Priorize e converta os melhores contatos em tempo real</p>
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

      {/* Grid de Cards de Safra */}
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

      {/* Sistema de Filtros Avançados */}
      <Card className="p-5 rounded-2xl border-border shadow-sm space-y-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          
          {/* Busca por texto */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente ou PDV..." 
              className="h-11 rounded-xl pl-9"
            />
          </div>

          {/* Seletor de Safra */}
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

          {/* Seletor de PDV */}
          <Select value={selectedPdv} onValueChange={setSelectedPdv}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Filtrar por PDV" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os PDVs</SelectItem>
              <SelectItem value="Posto Shell Renascença">Posto Shell Renascença</SelectItem>
              <SelectItem value="Auto Mecânica Centro">Auto Mecânica Centro</SelectItem>
              <SelectItem value="Lava Jato Cohama">Lava Jato Cohama</SelectItem>
            </SelectContent>
          </Select>

          {/* Ocultar contatados Switch */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border border-muted/50 rounded-xl">
            <span className="text-xs font-bold text-muted-foreground uppercase">Ocultar Contatados</span>
            <Switch checked={hideContacted} onCheckedChange={setHideContacted} />
          </div>
        </div>

        {/* Toggles (Todos / QR / Manual) */}
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

      {/* Tabela de Oportunidades Inteligente */}
      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-white flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Fila de Contatos Ativos
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Leads ordenados por Lead Scoring automático para maximizar conversões.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#206de2]">
            <Info className="w-4 h-4" /> 100% Sincronizado
          </div>
        </div>

        <div className="overflow-x-auto">
          <TooltipProvider>
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-6">Cliente</TableHead>
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
                    <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-12">
                      Nenhum lead encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedLeads.map((lead) => {
                    // Lead Scoring Prioritário (Borda Azul Esquerda)
                    const isHighPriority = getLeadScore(lead) >= 80;
                    
                    /* COMPLEMENTO B: Régua de Reengajamento */
                    const needsReengagement = 
                      (lead.safra === "Dez/25" || lead.safra === "Jan/26") && 
                      lead.lastCampaignDays > 15;

                    return (
                      <TableRow 
                        key={lead.id} 
                        className={`transition-all hover:bg-muted/10 relative ${
                          isHighPriority ? "border-l-4 border-l-[#206de2]" : ""
                        }`}
                      >
                        {/* Nome do Cliente com Badge de Prioridade */}
                        <TableCell className="font-bold pl-6">
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
                        
                        {/* Origem com Análise de Performance Tooltip */}
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

                        {/* Temperatura */}
                        <TableCell className="font-bold text-xs">{lead.temperature}</TableCell>

                        {/* Reengajamento Visual Alerta */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-semibold">
                              {lead.lastCampaignDays} dias atrás
                            </span>
                            {needsReengagement && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded-lg text-[9px] font-extrabold flex items-center gap-1 cursor-pointer">
                                    <AlertCircle className="w-3 h-3 text-rose-600 animate-bounce" /> ATENÇÃO
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="bg-card border border-border p-3 rounded-xl shadow-lg">
                                  <p className="text-xs font-bold text-rose-800">Régua de Reengajamento</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Leads antigos sem faturamento nos últimos 15 dias. A temperatura corre risco de esfriar.</p>
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
    </div>
  );
}
