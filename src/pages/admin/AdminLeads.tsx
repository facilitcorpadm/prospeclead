import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReadOnly } from "@/hooks/useReadOnly";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Search,
  Camera,
  MapPin,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Edit,
  MoreHorizontal,
  Sparkles,
  BadgeDollarSign,
  Download
} from "lucide-react";
import { recognizePlateFromImage } from "@/lib/ocr";
import { LeadCommissionDetails } from "@/components/admin/LeadCommissionDetails";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function AdminLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recognizingId, setRecognizingId] = useState<string | null>(null);
  const [commissionLead, setCommissionLead] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [filterPraca, setFilterPraca] = useState("all");
  const [filterMedo, setFilterMedo] = useState("all");
  const readOnly = useReadOnly();

  const handleExtractPlate = async (leadId: string, signedUrl: string) => {
    setRecognizingId(leadId);
    try {
      toast.info("A IA está analisando a imagem...", { duration: 4000 });
      const plate = await recognizePlateFromImage(signedUrl);
      
      if (plate) {
        const { error: updateErr } = await supabase.from('leads').update({ vehicle_plate: plate }).eq('id', leadId);
        if (updateErr) throw updateErr;
        toast.success(`Placa encontrada: ${plate}!`);
        await loadLeads();
      } else {
        toast.error("A IA não conseguiu ler a placa com precisão.");
      }
    } catch (e) {
      toast.error("Erro ao extrair placa.");
    } finally {
      setRecognizingId(null);
    }
  };

  const autoProcessMissingPlates = async (leadsData: any[]) => {
    const missing = leadsData.filter(l => (!l.vehicle_plate && !l.placa && !l.plate) && l.photo_url && l.signed_url);
    
    // Processa os 10 primeiros por vez para não travar o navegador
    const toProcess = missing.slice(0, 10);
    if (toProcess.length === 0) return;

    for (const l of toProcess) {
      try {
        const plate = await recognizePlateFromImage(l.signed_url);
        if (plate) {
          await supabase.from('leads').update({ vehicle_plate: plate }).eq('id', l.id);
          // Atualiza a tabela na tela sem recarregar tudo
          setLeads(prev => prev.map(p => p.id === l.id ? { ...p, vehicle_plate: plate } : p));
        }
      } catch (e) {
        console.log("Erro ao autoprocessar IA", e);
      }
    }
  };

  const loadLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const leadsData = data || [];
      
      // Criar URLs seguras em lote para evitar rate limit!
      const pathsToSign = leadsData
        .filter(l => l.photo_url && !l.photo_url.startsWith('http'))
        .map(l => l.photo_url.startsWith('/') ? l.photo_url.substring(1) : l.photo_url);

      let signedUrlMap: Record<string, string> = {};
      
      if (pathsToSign.length > 0) {
        const { data: signedUrls, error: signError } = await supabase.storage
          .from("lead-photos")
          .createSignedUrls(pathsToSign, 60 * 60 * 24); // 24 horas
          
        if (!signError && signedUrls) {
          signedUrls.forEach(su => {
            if (!su.error) signedUrlMap[su.path] = su.signedUrl;
          });
        }
      }

      // Adiciona a signed_url a cada lead
      const leadsWithUrls = leadsData.map(l => {
        if (!l.photo_url) return l;
        if (l.photo_url.startsWith('http')) return { ...l, signed_url: l.photo_url };
        
        const cleanPath = l.photo_url.startsWith('/') ? l.photo_url.substring(1) : l.photo_url;
        return { ...l, signed_url: signedUrlMap[cleanPath] || null };
      });

      setLeads(leadsWithUrls);
      
      // Dispara a IA no background para os que faltam
      autoProcessMissingPlates(leadsWithUrls);

    } catch (error: any) {
      toast.error("Erro ao carregar leads: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lead permanentemente?")) return;
    
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lead excluído com sucesso!");
      loadLeads();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const nameVal = l.nome || l.name || "";
      const phoneVal = l.phone || "";
      const plateVal = l.placa || l.vehicle_plate || "";
      
      const matchesSearch = 
        nameVal.toLowerCase().includes(search.toLowerCase()) ||
        phoneVal.toLowerCase().includes(search.toLowerCase()) ||
        plateVal.toLowerCase().includes(search.toLowerCase());
      
      const pracaVal = l.praca || l.city || "all";
      const medoVal = l.medo || l.pain || "all";

      const matchesPraca = filterPraca === "all" || pracaVal === filterPraca;
      const matchesMedo = filterMedo === "all" || medoVal === filterMedo;

      return matchesSearch && matchesPraca && matchesMedo;
    });
  }, [leads, search, filterPraca, filterMedo]);

  const pracas = Array.from(new Set(leads.map(l => l.praca || l.city).filter(Boolean)));
  const medos = Array.from(new Set(leads.map(l => l.medo || l.pain).filter(Boolean)));

  const formatPhone = (phone: string) => {
    if (!phone) return phone;
    let cleaned = phone.replace(/\D/g, "");
    
    if (cleaned.startsWith("55") && (cleaned.length === 13 || cleaned.length === 12)) {
      cleaned = cleaned.slice(2);
    }

    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    
    return phone;
  };

  const exportToExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const rows = filteredLeads.map((l) => {
        let digits = String(l.phone || "").replace(/\D/g, "");
        if (digits && !digits.startsWith("55")) digits = "55" + digits;
        return {
          Phone: digits,
          "First Name": l.nome || l.name || "",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows, { header: ["Phone", "First Name"] });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, `leads-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Excel exportado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao exportar: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Leads</h1>
          <p className="text-muted-foreground text-sm">Controle total dos leads captados em campo.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="default" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Baixar Excel
          </Button>
          <Button onClick={loadLeads} variant="outline" size="sm">
            Atualizar Dados
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4 border-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, telefone ou placa..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2">
            <MapPin className="w-4 h-4 mt-3 text-muted-foreground shrink-0" />
            <select 
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              value={filterPraca}
              onChange={(e) => setFilterPraca(e.target.value)}
            >
              <option value="all">Todas as Praças</option>
              {pracas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-3 text-muted-foreground shrink-0" />
            <select 
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              value={filterMedo}
              onChange={(e) => setFilterMedo(e.target.value)}
            >
              <option value="all">Todos os Medos</option>
              {medos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden border-2">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">Cliente</TableHead>
              <TableHead className="font-bold">Veículo</TableHead>
              <TableHead className="font-bold">Profissão</TableHead>
              <TableHead className="font-bold">Praça</TableHead>
              <TableHead className="font-bold">Medo</TableHead>
              <TableHead className="font-bold">Evidência</TableHead>
              <TableHead className="font-bold">Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  Nenhum lead encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((l) => {
                const isMoto = (l.veiculo || l.vehicle_model || "").toLowerCase().includes("moto") || l.vehicle_type === "moto";
                
                return (
                  <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                    {/* Cliente */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{l.nome || l.name || "Não informado"}</span>
                        <a 
                          href={`https://wa.me/${l.phone?.replace(/\D/g, "")}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {l.phone ? formatPhone(l.phone) : "S/ Tel"}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </TableCell>

                    {/* Veículo */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{l.vehicle_model || l.veiculo || l.vehicle || "—"}</span>
                          <Badge 
                            className={cn(
                              "text-[10px] uppercase font-bold px-1.5 h-4",
                              isMoto ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-600 hover:bg-blue-700"
                            )}
                          >
                            {isMoto ? "Topy Pro" : "Rastremix"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded w-fit text-muted-foreground border">
                            {l.vehicle_plate || l.placa || l.plate || "SEM PLACA"}
                          </span>
                          {(!l.vehicle_plate && !l.placa && !l.plate && l.signed_url) && (
                            <button 
                              onClick={() => handleExtractPlate(l.id, l.signed_url)}
                              disabled={recognizingId === l.id}
                              className="text-[9px] flex items-center gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200 px-1.5 py-0.5 rounded transition font-medium"
                              title="Extrair placa com IA"
                            >
                              {recognizingId === l.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              Ler Placa
                            </button>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Profissão */}
                    <TableCell className="max-w-[130px]">
                      <span 
                        className="text-xs text-muted-foreground truncate block font-medium"
                        title={l.profession || l.profissao || "Não informada"}
                      >
                        {l.profession || l.profissao || "—"}
                      </span>
                    </TableCell>

                    {/* Praça */}
                    <TableCell className="max-w-[140px]">
                      <div className="flex items-center gap-1.5 group">
                        <span 
                          className="text-xs text-muted-foreground truncate block flex-1"
                          title={l.city || l.location || l.praca || ""}
                        >
                          {l.city || l.location || l.praca || "—"}
                        </span>
                        {(l.city || l.location || l.praca) && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="p-1 hover:bg-primary/10 rounded text-primary transition-colors shrink-0" title="Ver endereço completo">
                                <MapPin className="w-3.5 h-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4 shadow-2xl border-2">
                              <div className="space-y-2">
                                <h4 className="font-bold text-sm flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-primary" />
                                  Endereço Completo
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {l.city || l.location || l.praca}
                                </p>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </TableCell>

                    {/* Medo */}
                    <TableCell>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {l.pain || l.pain_point || l.medo || "—"}
                      </span>
                    </TableCell>

                    {/* Evidência */}
                    <TableCell>
                      {l.signed_url ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-background shadow-sm hover:scale-110 transition cursor-pointer bg-muted">
                              <img src={l.signed_url} alt="Lead thumbnail" className="w-full h-full object-cover" />
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl p-1">
                            <img src={l.signed_url} alt="Lead full" className="w-full h-auto rounded-lg" />
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground/30">
                          <Camera className="w-4 h-4" />
                        </div>
                      )}
                    </TableCell>

                    {/* Data */}
                    <TableCell className="text-xs text-muted-foreground">
                      {l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {!readOnly && (
                            <DropdownMenuItem className="cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" /> Editar Lead
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="cursor-pointer" onClick={() => setCommissionLead(l)}>
                            <BadgeDollarSign className="w-4 h-4 mr-2" />
                            <span>Extrato Financeiro</span>
                          </DropdownMenuItem>
                          {!readOnly && (
                            <DropdownMenuItem 
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => handleDelete(l.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
      
      <LeadCommissionDetails 
        lead={commissionLead} 
        isOpen={!!commissionLead} 
        onClose={() => setCommissionLead(null)} 
        onUpdate={loadLeads} 
      />
    </div>
  );
}
