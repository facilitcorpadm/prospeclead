import React, { useState, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Users,
  TrendingUp,
  Target,
  AlertCircle,
  Search,
  Filter,
  Calendar as LucideCalendar,
  Phone,
  User,
  MessageSquare,
  Clock,
  ExternalLink,
  Pencil,
  Trash2,
  MoreHorizontal,
  Flame,
  Snowflake,
  ChevronRight,
  ArrowRight,
  Plus,
  CheckCircle2,
  FileText,
  History,
  X,
  LayoutGrid,
  Loader2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ============================================================
   TYPES & CONSTANTS
   ============================================================ */

type LeadStatus = Database["public"]["Enums"]["lead_status"];

const COLUMNS: { id: LeadStatus; title: string; color: string }[] = [
  { id: "coletado", title: "Coletado", color: "bg-purple-500/10 border-purple-200" },
  { id: "prospectado", title: "Novo Lead", color: "bg-blue-500/10 border-blue-200" },
  { id: "contatado", title: "Contato Realizado", color: "bg-amber-500/10 border-amber-200" },
  { id: "respondido", title: "Qualificado", color: "bg-indigo-500/10 border-indigo-200" },
  { id: "negociando", title: "Em Negociação", color: "bg-cyan-500/10 border-cyan-200" },
  { id: "fechado", title: "Fechado", color: "bg-emerald-500/10 border-emerald-200" },
  { id: "vendido", title: "Vendido", color: "bg-slate-500/10 border-slate-200" },
];

// Removido Mock de Leads - Agora usando Supabase

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function AdminKanban() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterPromoter, setFilterPromoter] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showLost, setShowLost] = useState(true);

  // DnD & Modal States
  const [moveTarget, setMoveTarget] = useState<{ leadId: string, toColumn: LeadStatus } | null>(null);
  const [moveReason, setMoveReason] = useState("");
  const [createFollowup, setCreateFollowup] = useState(false);

  // Drawer State
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // --- FETCH DATA ---
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["leads-kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro Supabase Leads:", error);
        toast.error(`Erro ao carregar leads: ${error.message}`);
        throw error;
      }
      return data;
    },
  });

  const { data: promoters = [] } = useQuery({
    queryKey: ["promoters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  // --- MUTATIONS ---
  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, newStatus }: { leadId: string, newStatus: LeadStatus }) => {
      const { error } = await supabase
        .from("leads")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
      toast.success("Lead atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro na mutação:", error);
      toast.error("Erro ao mover lead.");
    }
  });

  const fixLeadsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("leads")
        .update({ status: "coletado" })
        .eq("status", "vendido");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
      toast.success("Todos os leads foram movidos para Coletado!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao corrigir leads: ${error.message}`);
    }
  });

  // --- COMPUTED ---
  const stats = useMemo(() => {
    const activeLeads = leads.filter(l => l.status !== "fechado"); // Simplificado
    const stuckLeads = leads.filter(l => {
      const days = differenceInDays(new Date(), new Date(l.updated_at || l.created_at));
      return days > 7 && l.status !== "fechado" && l.status !== "vendido";
    }).length;
    
    const colCounts = COLUMNS.map(col => ({
      id: col.id,
      title: col.title,
      count: leads.filter(l => l.status === col.id).length
    }));
    const bottleneck = [...colCounts].sort((a, b) => b.count - a.count)[0];

    return {
      totalActive: activeLeads.length,
      stuckLeads,
      convRate: leads.length > 0 ? `${((leads.filter(l => l.status === "vendido").length / leads.length) * 100).toFixed(1)}%` : "0%",
      bottleneck: bottleneck?.title || "Nenhuma",
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // Filtros
      if (filterPromoter !== "all" && l.user_id !== filterPromoter) return false;
      if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [leads, search, filterPromoter]);

  /* ----- HANDLERS ----- */

  const onDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent, toColumnId: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    const lead = leads.find(l => l.id === leadId);
    
    if (lead && lead.status !== toColumnId) {
      setMoveTarget({ leadId, toColumn: toColumnId });
      setMoveReason("");
    }
  };

  const confirmMove = () => {
    if (!moveTarget) return;
    updateStatusMutation.mutate({ 
      leadId: moveTarget.leadId, 
      newStatus: moveTarget.toColumn 
    });
    setMoveTarget(null);
  };


  return (
    <div className="space-y-6">
      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground">Gestão visual do pipeline de leads e oportunidades.</p>
        </div>
        <div className="flex items-center gap-3">
          {leads.filter(l => l.status === "vendido").length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => {
                if (window.confirm(`Deseja mover todos os ${leads.filter(l => l.status === "vendido").length} leads da coluna Vendido para Coletado?`)) {
                  fixLeadsMutation.mutate();
                }
              }}
              disabled={fixLeadsMutation.isPending}
              className="gap-2 shadow-lg animate-pulse"
            >
              <AlertCircle className="w-4 h-4" />
              Corrigir {leads.filter(l => l.status === "vendido").length} leads
            </Button>
          )}
        </div>
      </div>

      {/* ---------- METRICS ---------- */}
      {loadingLeads ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Leads Ativos" value={stats.totalActive} icon={Users} />
          <MetricCard 
            label="Parados > 7 dias" 
            value={stats.stuckLeads} 
            icon={AlertCircle} 
            badge={stats.stuckLeads > 0 ? { text: "Alerta", color: "bg-red-500" } : undefined} 
          />
          <MetricCard label="Conversão Semanal" value={stats.convRate} icon={TrendingUp} />
          <MetricCard label="Gargalo Atual" value={stats.bottleneck} icon={Target} subtext="Coluna com mais leads" />
        </div>
      )}

      {/* ---------- FILTERS ---------- */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome do lead..." 
              className="pl-9" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:flex gap-3">
            <Select value={filterPromoter} onValueChange={setFilterPromoter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Responsáveis</SelectItem>
                {promoters.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prioridades</SelectItem>
                <SelectItem value="Quente">Quente 🔥</SelectItem>
                <SelectItem value="Frio">Frio ❄️</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/20">
              <span className="text-xs font-medium">Ocultar Perdidos</span>
              <Checkbox checked={!showLost} onCheckedChange={(val) => setShowLost(!val)} />
            </div>
          </div>
        </div>
      </Card>

      {/* ---------- KANBAN BOARD ---------- */}
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex gap-4 p-1">
          {COLUMNS.map(col => {
            const colLeads = filteredLeads.filter(l => l.status === col.id);
            return (
              <div 
                key={col.id} 
                className="flex-shrink-0 w-80 flex flex-col h-[calc(100vh-400px)] min-h-[500px]"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.id)}
              >
                <div className={cn("p-3 rounded-t-xl border-t border-x font-semibold flex items-center justify-between", col.color)}>
                  <span className="text-sm truncate">{col.title}</span>
                  <Badge variant="secondary" className="bg-white/50 text-[10px]">{colLeads.length}</Badge>
                </div>
                <div className="flex-1 bg-muted/20 border-x border-b rounded-b-xl overflow-hidden">
                  <ScrollArea className="h-full px-3 py-4">
                    <div className="space-y-3">
                      {colLeads.map(lead => (
                        <LeadCard 
                          key={lead.id} 
                          lead={lead} 
                          promoters={promoters}
                          onDragStart={onDragStart} 
                          onClick={() => { setSelectedLead(lead); setDrawerOpen(true); }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* ---------- MODALS & DRAWERS ---------- */}
      
      {/* MOVEMENT MOTIVATION MODAL */}
      <Dialog open={!!moveTarget} onOpenChange={(open) => !open && setMoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Movimentação</DialogTitle>
            <DialogDescription>
              Você está movendo o lead para a coluna <b>{COLUMNS.find(c => c.id === moveTarget?.toColumn)?.title}</b>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="reason">O que motivou essa mudança? *</Label>
              <Textarea 
                id="reason" 
                placeholder="Ex: Cliente demonstrou interesse no orçamento e solicitou visita." 
                value={moveReason}
                onChange={e => setMoveReason(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex items-center space-x-2 bg-muted/40 p-3 rounded-lg border">
              <Checkbox id="followup" checked={createFollowup} onCheckedChange={(v) => setCreateFollowup(!!v)} />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="followup" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Criar tarefa de follow-up automaticamente?
                </label>
                <p className="text-xs text-muted-foreground">Será agendada uma tarefa vinculada a este promotor.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoveTarget(null)}>Cancelar</Button>
            <Button onClick={confirmMove}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LEAD DETAIL DRAWER */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-6 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn(
                selectedLead?.priority === "Quente" ? "border-orange-500 text-orange-600" : "border-blue-500 text-blue-600"
              )}>
                {selectedLead?.priority === "Quente" ? <Flame className="w-3 h-3 mr-1" /> : <Snowflake className="w-3 h-3 mr-1" />}
                {selectedLead?.priority}
              </Badge>
              <Badge variant="secondary">{COLUMNS.find(c => c.id === selectedLead?.column)?.title}</Badge>
            </div>
            <SheetTitle className="text-2xl">{selectedLead?.name}</SheetTitle>
            <SheetDescription className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" /> {selectedLead?.phone}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-8">
            {/* DETAILS */}
            <div className="grid grid-cols-2 gap-6">
              <DetailItem icon={User} label="Responsável" value={promoters.find(p => p.id === selectedLead?.user_id)?.full_name} />
              <DetailItem icon={LucideCalendar} label="Data de Entrada" value={selectedLead && format(new Date(selectedLead.created_at), "dd/MM/yyyy")} />
              <DetailItem icon={Clock} label="Última Atualização" value={selectedLead && format(new Date(selectedLead.updated_at || selectedLead.created_at), "dd/MM/yyyy")} />
              <DetailItem icon={CheckCircle2} label="Tipo de Lead" value={selectedLead?.kind?.toUpperCase()} />
            </div>

            {/* ANNOTATIONS */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> Anotações Livres</Label>
              <Card className="p-3 bg-muted/20 text-sm italic">
                {selectedLead?.notes || "Nenhuma anotação disponível."}
              </Card>
              <Button variant="outline" size="sm" className="w-full gap-2"><Pencil className="w-3.5 h-3.5" /> Editar Anotações</Button>
            </div>

            {/* HISTORY */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2"><History className="w-4 h-4" /> Informações Adicionais</Label>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Lead ID: {selectedLead?.id}</p>
                <p className="text-xs text-muted-foreground">Cidade: {selectedLead?.city || "Não informada"}</p>
                {selectedLead?.vehicle_plate && <p className="text-xs text-muted-foreground">Placa: {selectedLead.vehicle_plate}</p>}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t mt-6 flex flex-col gap-2">
            <Button className="w-full gap-2"><Plus className="w-4 h-4" /> Criar Tarefa</Button>
            <Button variant="outline" className="w-full gap-2"><Pencil className="w-4 h-4" /> Editar Lead</Button>
            <Button variant="ghost" className="w-full" onClick={() => setDrawerOpen(false)}>Fechar</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

function MetricCard({ label, value, icon: Icon, badge, subtext }: any) {
  return (
    <Card className="p-4 flex items-center justify-between">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          {badge && <Badge className={cn("text-[8px] h-4 px-1 leading-none uppercase", badge.color)}>{badge.text}</Badge>}
        </div>
        <p className="text-2xl font-bold truncate">{value}</p>
        {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
      </div>
      <div className="p-3 bg-primary/10 rounded-xl">
        <Icon className="w-5 h-5 text-primary" />
      </div>
    </Card>
  );
}

function LeadCard({ lead, onDragStart, onClick, promoters }: any) {
  const daysSinceUpdate = differenceInDays(new Date(), new Date(lead.updated_at || lead.created_at));
  const isStuck = daysSinceUpdate > 7 && lead.status !== "fechado" && lead.status !== "vendido";
  const promoterName = promoters.find((p: any) => p.id === lead.user_id)?.full_name || "Sem responsável";

  return (
    <div 
      draggable 
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={onClick}
      className={cn(
        "bg-background p-4 rounded-xl border-2 border-transparent shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all group",
        isStuck && "bg-red-50/50 dark:bg-red-950/10 border-red-200/50"
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <p className="font-bold text-sm leading-snug group-hover:text-primary transition-colors">{lead.name}</p>
          <Badge variant="outline" className="text-[10px] uppercase">{lead.kind}</Badge>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Phone className="w-3 h-3" />
          {lead.phone || "(Não informado)"}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6 border">
              <AvatarFallback className="text-[8px] bg-primary/10">{promoterName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">{promoterName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted", isStuck && "bg-red-500 text-white")}>
              {daysSinceUpdate}d
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
