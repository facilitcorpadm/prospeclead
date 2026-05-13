import { useState, useMemo } from "react";
import { 
  Camera, 
  Hourglass, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  RefreshCw, 
  LayoutGrid, 
  List, 
  Eye, 
  MapPin, 
  Phone, 
  Car,
  Search,
  ChevronRight,
  TrendingUp,
  Building2
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/* ---------- Tipos ---------- */
type AuditStatus = "aguardando" | "aprovado" | "rejeitado";

interface AuditItem {
  id: string;
  company: string;
  image_url: string;
  lead_name: string;
  lead_role: string;
  phone: string;
  location: string;
  plate: string;
  status: AuditStatus;
  created_at: string;
}

/* ---------- Mock Data ---------- */
const MOCK_ITEMS: AuditItem[] = [
  {
    id: "1",
    company: "Valeteck",
    image_url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400",
    lead_name: "Ricardo Mendes",
    lead_role: "Gerente de Frota",
    phone: "(11) 98877-6655",
    location: "São Bernardo - SP",
    plate: "BRA-2E19",
    status: "aguardando",
    created_at: "2026-05-05T09:15:00Z",
  },
  {
    id: "2",
    company: "Rastremix",
    image_url: "https://images.unsplash.com/photo-1558981403-c5f97dbbe480?auto=format&fit=crop&q=80&w=400",
    lead_name: "Ana Paula Silva",
    lead_role: "Proprietária",
    phone: "(21) 97766-5544",
    location: "Rio de Janeiro - RJ",
    plate: "KML-4050",
    status: "aguardando",
    created_at: "2026-05-05T10:30:00Z",
  },
  {
    id: "3",
    company: "Valeteck",
    image_url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=400",
    lead_name: "Marcos Oliveira",
    lead_role: "Coordenador",
    phone: "(31) 96655-4433",
    location: "Betim - MG",
    plate: "HGT-1234",
    status: "aprovado",
    created_at: "2026-05-04T15:20:00Z",
  },
  {
    id: "4",
    company: "Rastremix",
    image_url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400",
    lead_name: "Juliana Costa",
    lead_role: "Logística",
    phone: "(41) 95544-3322",
    location: "Curitiba - PR",
    plate: "PRT-9988",
    status: "rejeitado",
    created_at: "2026-05-04T16:45:00Z",
  },
];

/* ---------- Estilos Customizados ---------- */
const PRIMARY_COLOR = "#206de2";

/* ---------- Componente Principal ---------- */
export default function AdminAuditoriaFotos() {
  const [viewType, setViewType] = useState<"grid" | "table">("grid");
  const [activeTab, setActiveTab] = useState<AuditStatus>("aguardando");
  const [loading, setLoading] = useState(false);

  /* Cálculos de Negócio */
  const stats = useMemo(() => {
    const aguardando = MOCK_ITEMS.filter(i => i.status === "aguardando").length;
    const aprovados = MOCK_ITEMS.filter(i => i.status === "aprovado").length;
    const rejeitados = MOCK_ITEMS.filter(i => i.status === "rejeitado").length;
    
    // R$ 2,00 aprovada, R$ 1,00 rejeitada, Potencial: aguardando * 2
    const comissaoAcumulada = (aprovados * 2) + (rejeitados * 1);
    const potencialPendente = aguardando * 2;

    return { aguardando, aprovados, rejeitados, comissaoAcumulada, potencialPendente };
  }, []);

  const filteredItems = useMemo(() => {
    return MOCK_ITEMS.filter(i => i.status === activeTab);
  }, [activeTab]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Camera className="w-6 h-6 text-[#206de2]" />
            Auditoria de Fotos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Validação técnica de instalações e conformidade visual para liberação de comissões.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={loading}
          className="gap-2 border-[#206de2] text-[#206de2] hover:bg-[#206de2]/5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </Button>
      </div>

      {/* Dashboard de Status (Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard 
          label="Aguardando" 
          value={stats.aguardando} 
          icon={Hourglass} 
          color="text-amber-600" 
          bg="bg-amber-50" 
          description="Ações pendentes"
        />
        <StatusCard 
          label="Aprovados" 
          value={stats.aprovados} 
          icon={CheckCircle2} 
          color="text-emerald-600" 
          bg="bg-emerald-50" 
          description="Comissão integral"
        />
        <StatusCard 
          label="Rejeitados" 
          value={stats.rejeitados} 
          icon={XCircle} 
          color="text-red-600" 
          bg="bg-red-50" 
          description="Necessita revisão"
        />
        <StatusCard 
          label="Potencial a Liberar" 
          value={`R$ ${stats.potencialPendente},00`} 
          icon={DollarSign} 
          color="text-blue-600" 
          bg="bg-blue-50" 
          description={`Acumulado: R$ ${stats.comissaoAcumulada},00`}
        />
      </div>

      {/* Filtros e Controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-2 rounded-xl border border-border shadow-sm">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AuditStatus)} className="w-full md:w-auto">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="aguardando" className="gap-2 rounded-lg data-[state=active]:bg-background">
              Aguardando <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{stats.aguardando}</Badge>
            </TabsTrigger>
            <TabsTrigger value="aprovado" className="gap-2 rounded-lg data-[state=active]:bg-background">
              Aprovados
            </TabsTrigger>
            <TabsTrigger value="rejeitado" className="gap-2 rounded-lg data-[state=active]:bg-background">
              Rejeitados
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-6 px-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className={`w-4 h-4 ${viewType === 'grid' ? 'text-[#206de2]' : 'text-muted-foreground'}`} />
            <Switch 
              checked={viewType === 'table'} 
              onCheckedChange={(checked) => setViewType(checked ? 'table' : 'grid')} 
            />
            <List className={`w-4 h-4 ${viewType === 'table' ? 'text-[#206de2]' : 'text-muted-foreground'}`} />
          </div>
          <div className="relative w-full max-w-[200px] hidden sm:block">
             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
             <Input placeholder="Buscar placa..." className="pl-8 h-9 text-xs" />
          </div>
        </div>
      </div>

      {/* Área de Conteúdo */}
      <div className="min-h-[500px]">
        {viewType === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <AuditCard key={item.id} item={item} />
            ))}
            {filteredItems.length === 0 && <EmptyState tab={activeTab} />}
          </div>
        ) : (
          <Card className="rounded-xl border-border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Lead / Empresa</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Data Envio</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-bold text-sm">{item.lead_name}</p>
                        <p className="text-[10px] text-[#206de2] font-bold uppercase">{item.company}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{item.plate}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.location}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-8 gap-2 text-[#206de2]">
                        <Eye className="w-3.5 h-3.5" /> Auditar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-60 text-center text-muted-foreground">
                      Nenhum item encontrado nesta aba.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ---------- Sub-componentes ---------- */

function StatusCard({ label, value, icon: Icon, color, bg, description }: any) {
  return (
    <Card className="p-4 rounded-xl border-border shadow-sm hover:shadow-md transition-all group relative overflow-hidden bg-card">
      <div className={`absolute top-0 right-0 w-16 h-16 ${bg} rounded-bl-full opacity-50 -mr-6 -mt-6 group-hover:scale-110 transition-transform`} />
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest leading-none">{label}</p>
          <h3 className={`text-2xl font-bold ${color}`}>{value}</h3>
          <p className="text-[11px] text-muted-foreground font-medium">{description}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${bg} ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

function AuditCard({ item }: { item: AuditItem }) {
  return (
    <Card className="group rounded-xl border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={item.image_url} 
          alt={`Veículo ${item.plate}`} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
           <Button className="w-full gap-2 bg-[#206de2] hover:bg-[#206de2]/90 h-9 text-xs font-bold uppercase">
             <Eye className="w-3.5 h-3.5" /> Ver Foto & Auditar
           </Button>
        </div>
        <Badge className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[#206de2] border-none shadow-sm flex items-center gap-1.5 px-2 py-0.5">
          <Building2 className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase">{item.company}</span>
        </Badge>
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h4 className="font-bold text-sm truncate">{item.lead_name}</h4>
            <p className="text-[11px] text-muted-foreground">{item.lead_role}</p>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5 shrink-0 bg-muted border-border">
            {item.plate}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Phone className="w-3 h-3 text-[#206de2]" /> {item.phone}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <MapPin className="w-3 h-3 text-[#206de2]" /> {item.location}
          </div>
        </div>

        <div className="pt-2 mt-auto">
          <Button variant="outline" className="w-full h-9 border-[#206de2] text-[#206de2] hover:bg-[#206de2]/5 text-xs font-bold uppercase gap-2 sm:hidden">
             Auditar
          </Button>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ tab }: { tab: AuditStatus }) {
  return (
    <div className="col-span-full h-80 flex flex-col items-center justify-center text-center gap-4 bg-muted/20 border-2 border-dashed border-muted rounded-xl">
      <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
        <Hourglass className="w-8 h-8 text-muted-foreground opacity-30" />
      </div>
      <div>
        <h3 className="text-lg font-bold">Nenhum item em "{tab}"</h3>
        <p className="text-sm text-muted-foreground max-w-xs mt-1">
          Não há fotos nesta categoria para serem auditadas no momento.
        </p>
      </div>
    </div>
  );
}
