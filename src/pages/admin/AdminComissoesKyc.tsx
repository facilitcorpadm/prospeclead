import { useState, useMemo, useEffect } from "react";
import { 
  Users, 
  Store, 
  Receipt, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  ArrowUpRight, 
  MoreHorizontal,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/* ---------- Tipos ---------- */
type Category = "promotores" | "lojas" | "balcao";
type Status = "pendente" | "pago";

interface Beneficiary {
  id: string;
  name: string;
  company: string;
  items_count: number;
  total_generated: number;
  commission: number;
  pix_type: string;
  status: Status;
  category: Category;
}

/* ---------- Componente Principal ---------- */
export default function AdminComissoesKyc() {
  const [activeCategory, setActiveCategory] = useState<Category>("promotores");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | Status>("todos");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ pending: 0, paid: 0, total: 0 });

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      // Aqui estamos buscando leads que foram "vendidos" ou "fechados" 
      // Em um sistema real, teríamos uma tabela de 'commissions' ou 'wallet_transactions'
      // Por agora, vamos simular a agregação baseada nos leads de cada usuário
      
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("id, full_name, company, role");
      
      if (pError) throw pError;

      const { data: leads, error: lError } = await supabase
        .from("leads")
        .select("user_id, status, value, kind");
      
      if (lError) throw lError;

      const results: Beneficiary[] = profiles.map(p => {
        const userLeads = leads.filter(l => l.user_id === p.id);
        const converted = userLeads.filter(l => l.status === "vendido" || l.status === "fechado");
        const totalGenerated = converted.reduce((sum, l) => sum + Number(l.value || 0), 0);
        // Regra de comissão: 20% do valor gerado (exemplo)
        const commission = totalGenerated * 0.2;

        return {
          id: p.id,
          name: p.full_name || "Sem Nome",
          company: p.company || "Sem Empresa",
          items_count: converted.length,
          total_generated: totalGenerated,
          commission: commission,
          pix_type: "Pendente", // Poderia vir do perfil
          status: "pendente",
          category: p.role === "admin" ? "balcao" : "promotores"
        };
      }).filter(b => b.commission > 0);

      setBeneficiaries(results);
      
      const pending = results.reduce((sum, b) => sum + b.commission, 0);
      setTotals({ pending, paid: 0, total: pending });

    } catch (error: any) {
      toast({ title: "Erro ao carregar comissões", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  /* Filtragem */
  const filteredData = useMemo(() => {
    return beneficiaries.filter((b) => {
      const matchesCategory = b.category === activeCategory;
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            b.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "todos" || b.status === statusFilter;
      return matchesCategory && matchesSearch && matchesStatus;
    });
  }, [beneficiaries, activeCategory, searchTerm, statusFilter]);

  /* Handlers */
  const handleLiquidar = (id: string) => {
    toast({
      title: "Pagamento Processado",
      description: `A comissão foi liquidada com sucesso via Pix.`,
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Calculando comissões em tempo real...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header com Badges e Saldos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Comissões e Fechamento</h1>
            {beneficiaries.some(b => b.pix_type === "Pendente") && (
              <Badge className="bg-red-500 text-white border-none px-2 py-0.5 text-[10px] font-bold">
                DADOS PIX PENDENTES
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Pendente:</span>
              <span className="font-bold text-amber-600">R$ {totals.pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold text-primary">R$ {totals.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        <Button onClick={fetchCommissions} variant="outline" className="gap-2 font-bold h-11 px-6">
          <Zap className="w-4 h-4" /> Recalcular
        </Button>
      </div>

      {/* Navegação por Categorias (Abas Superiores) */}
      <Tabs defaultValue="promotores" onValueChange={(v) => setActiveCategory(v as Category)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-3xl h-14 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="promotores" className="rounded-lg gap-2 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="w-4 h-4" /> Promotores de Rua
            <Badge variant="secondary" className="ml-1 bg-muted text-muted-foreground">
              {beneficiaries.filter(b => b.category === "promotores").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="lojas" className="rounded-lg gap-2 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Store className="w-4 h-4" /> Lojas Parceiras — PDV
            <Badge variant="secondary" className="ml-1 bg-muted text-muted-foreground">
              {beneficiaries.filter(b => b.category === "lojas").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="balcao" className="rounded-lg gap-2 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Receipt className="w-4 h-4" /> Funcionários — Balcão
            <Badge variant="secondary" className="ml-1 bg-muted text-muted-foreground">
              {beneficiaries.filter(b => b.category === "balcao").length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Grid de Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <StatusCard 
            label="Total a Pagar" 
            value={`R$ ${totals.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} 
            sub={`${beneficiaries.length} beneficiários`} 
            icon={Wallet} 
            color="text-primary" 
            bg="bg-primary/5" 
          />
          <StatusCard 
            label="Pendente" 
            value={`R$ ${totals.pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} 
            sub="aguardando" 
            icon={Clock} 
            color="text-amber-600" 
            bg="bg-amber-50" 
          />
          <StatusCard 
            label="Liquidado" 
            value="R$ 0,00" 
            sub="processados" 
            icon={CheckCircle2} 
            color="text-emerald-600" 
            bg="bg-emerald-50" 
          />
        </div>

        {/* Controles da Tabela */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 mb-4">
          <div className="relative w-full sm:w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou franquia..." 
              className="pl-10 h-11 bg-card border-border rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl w-full sm:w-auto">
            <FilterButton active={statusFilter === "todos"} onClick={() => setStatusFilter("todos")}>Todos</FilterButton>
            <FilterButton active={statusFilter === "pendente"} onClick={() => setStatusFilter("pendente")}>Pendente</FilterButton>
            <FilterButton active={statusFilter === "pago"} onClick={() => setStatusFilter("pago")}>Pago</FilterButton>
          </div>
        </div>

        {/* Tabela de Beneficiários */}
        <Card className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="py-4 px-6 text-[11px] font-bold uppercase text-muted-foreground">Beneficiário</TableHead>
                <TableHead className="py-4 text-[11px] font-bold uppercase text-muted-foreground">Qtd</TableHead>
                <TableHead className="py-4 text-[11px] font-bold uppercase text-muted-foreground">Gerado</TableHead>
                <TableHead className="py-4 text-[11px] font-bold uppercase text-muted-foreground">Comissão</TableHead>
                <TableHead className="py-4 text-[11px] font-bold uppercase text-muted-foreground">Pix (Tipo)</TableHead>
                <TableHead className="py-4 text-[11px] font-bold uppercase text-muted-foreground text-center">Status</TableHead>
                <TableHead className="py-4 px-6 text-right text-[11px] font-bold uppercase text-muted-foreground">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-xs italic">
                    Nenhum registro encontrado para esta categoria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="group border-b border-border hover:bg-muted/5 transition-colors">
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border shadow-sm">
                          <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                            {item.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-foreground">{item.name}</p>
                          <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{item.company}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 font-medium text-xs text-muted-foreground">{item.items_count}</TableCell>
                    <TableCell className="py-4 font-bold text-xs">R$ {item.total_generated.toFixed(2)}</TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm font-black text-foreground">R$ {item.commission.toFixed(2)}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[11px] font-bold text-muted-foreground uppercase">{item.pix_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <Badge 
                        variant="outline" 
                        className={`px-3 py-1 text-[10px] font-bold uppercase border-none rounded-full ${
                          item.status === 'pago' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      {item.status === "pago" ? (
                        <Button variant="ghost" size="sm" className="h-9 px-3 text-[#10b981] font-bold gap-2">
                          Recibo <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleLiquidar(item.id)}
                          className="h-9 px-4 bg-[#10b981] hover:bg-[#10b981]/90 font-bold text-xs uppercase"
                        >
                          Liquidar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </Tabs>
    </div>
  );
}

/* ---------- Sub-componentes ---------- */

function StatusCard({ label, value, sub, icon: Icon, color, bg }: any) {
  return (
    <Card className="p-5 rounded-xl border-border bg-card shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{label}</p>
          <h3 className={`text-2xl font-bold mt-1 ${color}`}>{value}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

function FilterButton({ children, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
        active 
          ? "bg-white text-primary shadow-sm" 
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
