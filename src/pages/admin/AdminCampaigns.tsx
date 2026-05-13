import { useState, useMemo } from "react";
import {
  Megaphone,
  Plus,
  Search,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertCircle,
  FileText,
  Users,
  Send,
  MessageSquare,
  CheckCheck,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Layout
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ---------- Tipos ---------- */
type CampaignStatus = "rascunho" | "agendada" | "executando" | "concluida" | "falhou";

interface Campaign {
  id: string;
  name: string;
  template_name: string;
  status: CampaignStatus;
  audience_size: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  reply_count: number;
  failed_count: number;
  scheduled_at: string | null;
  created_at: string;
}

/* ---------- Mock Data ---------- */
const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "1",
    name: "Boas-vindas Clientes Novos",
    template_name: "welcome_message_v2",
    status: "concluida",
    audience_size: 156,
    sent_count: 156,
    delivered_count: 152,
    read_count: 134,
    reply_count: 45,
    failed_count: 4,
    scheduled_at: null,
    created_at: "2026-04-28T10:00:00Z",
  },
  {
    id: "2",
    name: "Promoção Dia das Mães",
    template_name: "promo_mothers_day",
    status: "executando",
    audience_size: 1200,
    sent_count: 850,
    delivered_count: 842,
    read_count: 610,
    reply_count: 88,
    failed_count: 8,
    scheduled_at: null,
    created_at: "2026-05-05T08:00:00Z",
  },
  {
    id: "3",
    name: "Lembrete de Vencimento",
    template_name: "invoice_reminder",
    status: "agendada",
    audience_size: 45,
    sent_count: 0,
    delivered_count: 0,
    read_count: 0,
    reply_count: 0,
    failed_count: 0,
    scheduled_at: "2026-05-10T09:00:00Z",
    created_at: "2026-05-04T14:30:00Z",
  },
  {
    id: "4",
    name: "Pesquisa de Satisfação NPS",
    template_name: "nps_survey_2026",
    status: "rascunho",
    audience_size: 320,
    sent_count: 0,
    delivered_count: 0,
    read_count: 0,
    reply_count: 0,
    failed_count: 0,
    scheduled_at: null,
    created_at: "2026-05-05T10:15:00Z",
  },
  {
    id: "5",
    name: "Reativação Base Inativa",
    template_name: "reactivation_offer",
    status: "falhou",
    audience_size: 500,
    sent_count: 120,
    delivered_count: 110,
    read_count: 45,
    reply_count: 2,
    failed_count: 10,
    scheduled_at: null,
    created_at: "2026-05-01T11:00:00Z",
  },
];

/* ---------- Helpers ---------- */
const getStatusMeta = (status: CampaignStatus) => {
  switch (status) {
    case "rascunho":
      return { label: "Rascunho", color: "bg-gray-100 text-gray-600 border-gray-200", icon: FileText };
    case "agendada":
      return { label: "Agendada", color: "bg-blue-50 text-blue-600 border-blue-200", icon: Clock };
    case "executando":
      return { label: "Executando", color: "bg-amber-50 text-amber-600 border-amber-200", icon: PlayCircle };
    case "concluida":
      return { label: "Concluída", color: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: CheckCircle2 };
    case "falhou":
      return { label: "Falhou", color: "bg-red-50 text-red-600 border-red-200", icon: AlertCircle };
  }
};

const formatPct = (value: number, total: number) => {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
};

/* ---------- Componente ---------- */
export default function AdminCampaigns() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    return MOCK_CAMPAIGNS.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                            c.template_name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  /* Métricas Globais */
  const globalMetrics = useMemo(() => {
    const totalSent = MOCK_CAMPAIGNS.reduce((acc, c) => acc + c.sent_count, 0);
    const totalDelivered = MOCK_CAMPAIGNS.reduce((acc, c) => acc + c.delivered_count, 0);
    const totalRead = MOCK_CAMPAIGNS.reduce((acc, c) => acc + c.read_count, 0);
    const totalReply = MOCK_CAMPAIGNS.reduce((acc, c) => acc + c.reply_count, 0);
    const inExecution = MOCK_CAMPAIGNS.filter(c => c.status === "executando").length;
    
    return {
      sent: totalSent,
      delivered: totalDelivered,
      deliveredPct: formatPct(totalDelivered, totalSent),
      read: totalRead,
      readPct: formatPct(totalRead, totalSent),
      reply: totalReply,
      replyPct: formatPct(totalReply, totalSent),
      executing: inExecution
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campanhas WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie disparos em massa com templates aprovados pela Meta
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard 
          label="Total Enviadas" 
          value={globalMetrics.sent.toLocaleString()} 
          icon={Send} 
          color="text-primary"
          bg="bg-primary/5"
        />
        <MetricCard 
          label="Entregues" 
          value={globalMetrics.delivered.toLocaleString()} 
          subValue={globalMetrics.deliveredPct} 
          icon={CheckCircle2} 
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <MetricCard 
          label="Lidas" 
          value={globalMetrics.read.toLocaleString()} 
          subValue={globalMetrics.readPct} 
          icon={CheckCheck} 
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <MetricCard 
          label="Respondidas" 
          value={globalMetrics.reply.toLocaleString()} 
          subValue={globalMetrics.replyPct} 
          icon={MessageSquare} 
          color="text-violet-600"
          bg="bg-violet-50"
        />
        <MetricCard 
          label="Em Execução" 
          value={globalMetrics.executing.toString()} 
          icon={PlayCircle} 
          color="text-amber-600"
          bg="bg-amber-50"
        />
      </div>

      {/* Filters & Actions */}
      <Card className="p-4 rounded-xl border-border bg-card/50 backdrop-blur-sm flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome ou template..." 
            className="pl-9 bg-background/50" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-background/50">
              <SelectValue placeholder="Filtrar Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="agendada">Agendada</SelectItem>
              <SelectItem value="executando">Executando</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="falhou">Falhou</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="shrink-0 bg-background/50">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="shrink-0 bg-background/50">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="rounded-xl border-border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead className="min-w-[200px]">Campanha</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Audiência</TableHead>
              <TableHead className="text-center">Enviadas</TableHead>
              <TableHead className="text-center">Entregues</TableHead>
              <TableHead className="text-center">Lidas</TableHead>
              <TableHead className="text-center">Respostas</TableHead>
              <TableHead className="text-right">Criada em</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Megaphone className="w-8 h-8 opacity-20" />
                    <p>Nenhuma campanha encontrada.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((c) => (
                <>
                  <TableRow 
                    key={c.id} 
                    className={`hover:bg-muted/20 transition-colors cursor-pointer ${expandedId === c.id ? 'bg-muted/10' : ''}`}
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  >
                    <TableCell>
                      {expandedId === c.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{c.template_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-center font-medium">{c.audience_size}</TableCell>
                    <TableCell className="text-center">
                      <div>
                        <p className="font-medium">{c.sent_count}</p>
                        {c.failed_count > 0 && <p className="text-[10px] text-red-500 font-medium">-{c.failed_count} falhas</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <p className="font-medium">{c.delivered_count}</p>
                        <p className="text-[10px] text-muted-foreground">{formatPct(c.delivered_count, c.sent_count)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <p className="font-medium">{c.read_count}</p>
                        <p className="text-[10px] text-muted-foreground">{formatPct(c.read_count, c.sent_count)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <p className="font-medium text-primary">{c.reply_count}</p>
                        <p className="text-[10px] text-primary/70 font-semibold">{formatPct(c.reply_count, c.sent_count)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2">
                            <Eye className="w-4 h-4" /> Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Copy className="w-4 h-4" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Pencil className="w-4 h-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50">
                            <Trash2 className="w-4 h-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {expandedId === c.id && (
                    <TableRow className="bg-muted/5 border-b border-border shadow-inner">
                      <TableCell colSpan={10} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Progresso Detalhado */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <Activity className="w-3.5 h-3.5" /> Progresso da Entrega
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs font-medium">
                                <span>Status Geral ({c.sent_count}/{c.audience_size})</span>
                                <span>{formatPct(c.sent_count, c.audience_size)}</span>
                              </div>
                              <Progress value={(c.sent_count / c.audience_size) * 100} className="h-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-lg bg-background border border-border">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Taxa de Resposta</p>
                                <p className="text-lg font-bold text-primary">{formatPct(c.reply_count, c.sent_count)}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-background border border-border">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Falhas</p>
                                <p className="text-lg font-bold text-red-500">{c.failed_count}</p>
                              </div>
                            </div>
                          </div>
                          {/* Funil Local */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <BarChart3 className="w-3.5 h-3.5" /> Funil de Conversão
                            </h4>
                            <CampaignFunnel campaign={c} />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Footer Analítico: Funil Global */}
      <Card className="p-6 rounded-xl border-border bg-card shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold">Funil de Conversão — Geral</h3>
            <p className="text-xs text-muted-foreground">Desempenho agregado de todas as campanhas disparadas</p>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1">
            Total {MOCK_CAMPAIGNS.length} Campanhas
          </Badge>
        </div>

        <div className="flex flex-col gap-8 md:gap-4">
          <div className="relative pt-2">
             <div className="flex flex-col md:flex-row items-center gap-0 md:gap-2">
                <FunnelStep 
                  label="Enviadas" 
                  value={globalMetrics.sent} 
                  pct="100%" 
                  color="bg-primary" 
                  isFirst 
                />
                <FunnelStep 
                  label="Entregues" 
                  value={globalMetrics.delivered} 
                  pct={globalMetrics.deliveredPct} 
                  color="bg-emerald-500" 
                />
                <FunnelStep 
                  label="Lidas" 
                  value={globalMetrics.read} 
                  pct={globalMetrics.readPct} 
                  color="bg-blue-500" 
                />
                <FunnelStep 
                  label="Respondidas" 
                  value={globalMetrics.reply} 
                  pct={globalMetrics.replyPct} 
                  color="bg-violet-500" 
                  isLast
                />
             </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Sub-componentes ---------- */

function MetricCard({ label, value, subValue, icon: Icon, color, bg }: any) {
  return (
    <Card className="p-4 rounded-xl border-border bg-card hover:shadow-md transition-all group overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-16 h-16 ${bg} rounded-bl-full opacity-50 -mr-6 -mt-6 group-hover:scale-110 transition-transform`} />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold">{value}</h3>
            {subValue && <span className={`text-xs font-bold ${color}`}>{subValue}</span>}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg ${bg} ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`gap-1.5 px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wide border ${meta.color}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </Badge>
  );
}

function CampaignFunnel({ campaign }: { campaign: Campaign }) {
  const steps = [
    { label: "Enviadas", value: campaign.sent_count, color: "bg-primary" },
    { label: "Entregues", value: campaign.delivered_count, color: "bg-emerald-500" },
    { label: "Lidas", value: campaign.read_count, color: "bg-blue-500" },
    { label: "Respostas", value: campaign.reply_count, color: "bg-violet-500" },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.label} className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
            <span>{step.label}</span>
            <span>{step.value} ({formatPct(step.value, campaign.sent_count)})</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${step.color} transition-all duration-500`} 
              style={{ width: formatPct(step.value, campaign.sent_count) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FunnelStep({ label, value, pct, color, isFirst, isLast }: any) {
  return (
    <div className="flex-1 w-full group relative">
      <div className={`p-4 rounded-xl border border-border bg-muted/20 relative z-10 hover:bg-muted/40 transition-colors`}>
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{label}</span>
          <Badge variant="secondary" className="text-[10px] font-bold">{pct}</Badge>
        </div>
        <p className="text-xl font-bold">{value.toLocaleString()}</p>
        <div className={`h-1.5 w-full mt-3 rounded-full bg-muted overflow-hidden`}>
          <div className={`h-full ${color}`} style={{ width: pct }} />
        </div>
      </div>
      {!isLast && (
        <div className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 z-20">
          <div className="w-4 h-4 bg-card border-t border-r border-border rotate-45" />
        </div>
      )}
    </div>
  );
}

function Activity({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
