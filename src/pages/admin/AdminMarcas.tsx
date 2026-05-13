import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, RefreshCw, CheckCircle2, XCircle, Zap, Search, Edit, Trash2, MoreHorizontal } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface BrandSettings {
  id: number;
  tenant_id: string;
  brand_name: string;
  brand_cnpj: string | null;
  brand_logo_url: string | null;
  plan: string;
  contact_email: string | null;
  updated_at: string;
}

export default function AdminMarcas() {
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<BrandSettings[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [brandToEdit, setBrandToEdit] = useState<BrandSettings | null>(null);
  const [newBrand, setNewBrand] = useState({
    brand_name: "",
    brand_cnpj: "",
    contact_email: "",
    plan: "free",
  });

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar marcas", { description: error.message });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBrands();
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.brand_name) {
      toast.error("O nome da marca é obrigatório");
      return;
    }

    try {
      setIsCreating(true);
      
      const baseSlug = newBrand.brand_name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      
      const tenant_id = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;

      const { data, error } = await supabase
        .from("app_settings")
        .insert({
          brand_name: newBrand.brand_name,
          brand_cnpj: newBrand.brand_cnpj || null,
          contact_email: newBrand.contact_email || null,
          plan: newBrand.plan as any,
          tenant_id: tenant_id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Marca criada com sucesso!");
      setIsCreateModalOpen(false);
      setNewBrand({ brand_name: "", brand_cnpj: "", contact_email: "", plan: "free" });
      
      setBrands((prev) => [data, ...prev]);
    } catch (error: any) {
      toast.error("Erro ao criar marca", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandToEdit) return;

    try {
      setIsUpdating(true);
      const { data, error } = await supabase
        .from("app_settings")
        .update({
          brand_name: brandToEdit.brand_name,
          brand_cnpj: brandToEdit.brand_cnpj,
          contact_email: brandToEdit.contact_email,
          plan: brandToEdit.plan as any,
        })
        .eq("id", brandToEdit.id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Marca atualizada com sucesso!");
      setIsEditModalOpen(false);
      setBrands((prev) => prev.map((b) => (b.id === data.id ? data : b)));
    } catch (error: any) {
      toast.error("Erro ao atualizar marca", { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteBrand = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta marca? Esta ação não pode ser desfeita.")) return;

    try {
      const { error } = await supabase
        .from("app_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Marca excluída com sucesso!");
      setBrands((prev) => prev.filter((b) => b.id !== id));
    } catch (error: any) {
      toast.error("Erro ao excluir marca", { description: error.message });
    }
  };

  const filteredBrands = brands.filter((brand) => {
    const matchesSearch =
      (brand.brand_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (brand.brand_cnpj || "").toLowerCase().includes(search.toLowerCase()) ||
      (brand.contact_email || "").toLowerCase().includes(search.toLowerCase());
    
    const isActive = true;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && isActive) ||
      (statusFilter === "inactive" && !isActive);

    const matchesPlan = planFilter === "all" || brand.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const totalBrands = brands.length;
  const activeBrands = brands.length; 
  const inactiveBrands = 0;
  const enterpriseBrands = brands.filter(b => b.plan === "enterprise").length;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Marcas</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie franquias e operações white-label do sistema
            </p>
          </div>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Marca
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreateBrand}>
              <DialogHeader>
                <DialogTitle>Criar Nova Marca</DialogTitle>
                <DialogDescription>
                  Adicione uma nova franquia ou operação white-label ao sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="brand_name">Nome da Marca *</Label>
                  <Input
                    id="brand_name"
                    value={newBrand.brand_name}
                    onChange={(e) => setNewBrand({ ...newBrand, brand_name: e.target.value })}
                    placeholder="Ex: Botega Fashion"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brand_cnpj">CNPJ</Label>
                  <Input
                    id="brand_cnpj"
                    value={newBrand.brand_cnpj}
                    onChange={(e) => setNewBrand({ ...newBrand, brand_cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact_email">E-mail de Contato</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={newBrand.contact_email}
                    onChange={(e) => setNewBrand({ ...newBrand, contact_email: e.target.value })}
                    placeholder="contato@marca.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plan">Plano</Label>
                  <Select
                    value={newBrand.plan}
                    onValueChange={(value) => setNewBrand({ ...newBrand, plan: value })}
                  >
                    <SelectTrigger id="plan">
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Salvando..." : "Criar Marca"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-xl border border-border bg-[#5340C6] text-white flex flex-col justify-between h-[100px] shadow-sm">
          <div className="flex items-center justify-between">
            <Building2 className="w-5 h-5 opacity-80" />
            <span className="text-3xl font-bold">{totalBrands}</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Total de Marcas</h3>
            <p className="text-[11px] opacity-80">franquias registradas</p>
          </div>
        </Card>
        
        <Card className="p-5 rounded-xl border border-border bg-[#43A047] text-white flex flex-col justify-between h-[100px] shadow-sm">
          <div className="flex items-center justify-between">
            <CheckCircle2 className="w-5 h-5 opacity-80" />
            <span className="text-3xl font-bold">{activeBrands}</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Marcas Ativas</h3>
            <p className="text-[11px] opacity-80">em operação</p>
          </div>
        </Card>

        <Card className="p-5 rounded-xl border border-border bg-[#607D8B] text-white flex flex-col justify-between h-[100px] shadow-sm">
          <div className="flex items-center justify-between">
            <XCircle className="w-5 h-5 opacity-80" />
            <span className="text-3xl font-bold">{inactiveBrands}</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Inativas</h3>
            <p className="text-[11px] opacity-80">suspensas</p>
          </div>
        </Card>

        <Card className="p-5 rounded-xl border border-border bg-[#FF9800] text-white flex flex-col justify-between h-[100px] shadow-sm">
          <div className="flex items-center justify-between">
            <Zap className="w-5 h-5 opacity-80" />
            <span className="text-3xl font-bold">{enterpriseBrands}</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Enterprise</h3>
            <p className="text-[11px] opacity-80">plano top</p>
          </div>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="inactive">Inativas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full sm:w-[150px] bg-background">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="shrink-0 bg-background"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Listagem de Marcas (ou Empty State) */}
      <Card className="rounded-xl border border-border bg-card shadow-sm min-h-[400px]">
        {loading && !isRefreshing ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground/50">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1 text-foreground/80">Nenhuma marca encontrada</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Clique em "+ Nova Marca" para começar
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="p-0">
               <table className="w-full text-sm text-left">
                 <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b border-border">
                   <tr>
                     <th className="px-6 py-4 font-medium">Marca</th>
                     <th className="px-6 py-4 font-medium">CNPJ</th>
                     <th className="px-6 py-4 font-medium">Contato</th>
                     <th className="px-6 py-4 font-medium">Plano</th>
                     <th className="px-6 py-4 font-medium">Status</th>
                     <th className="px-6 py-4 font-medium text-right">Ações</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                   {filteredBrands.map(brand => (
                     <tr key={brand.id} className="hover:bg-muted/30 transition-colors">
                       <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                           {brand.brand_logo_url ? (
                             <img src={brand.brand_logo_url} alt={brand.brand_name} className="w-8 h-8 rounded bg-background object-cover border" />
                           ) : (
                             <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                               {brand.brand_name.substring(0, 2).toUpperCase()}
                             </div>
                           )}
                           <span className="font-medium text-foreground">{brand.brand_name}</span>
                         </div>
                       </td>
                       <td className="px-6 py-4 text-muted-foreground">{brand.brand_cnpj || "—"}</td>
                       <td className="px-6 py-4 text-muted-foreground">{brand.contact_email || "—"}</td>
                       <td className="px-6 py-4 text-muted-foreground capitalize">
                          {brand.plan || "free"}
                       </td>
                       <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
                            Ativa
                          </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-8 w-8 text-muted-foreground hover:text-primary"
                             onClick={() => {
                               setBrandToEdit(brand);
                               setIsEditModalOpen(true);
                             }}
                           >
                             <Edit className="w-4 h-4" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-8 w-8 text-muted-foreground hover:text-destructive"
                             onClick={() => handleDeleteBrand(brand.id)}
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          {brandToEdit && (
            <form onSubmit={handleEditBrand}>
              <DialogHeader>
                <DialogTitle>Editar Marca</DialogTitle>
                <DialogDescription>
                  Atualize as informações da marca selecionada.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_brand_name">Nome da Marca *</Label>
                  <Input
                    id="edit_brand_name"
                    value={brandToEdit.brand_name}
                    onChange={(e) => setBrandToEdit({ ...brandToEdit, brand_name: e.target.value })}
                    placeholder="Ex: Botega Fashion"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_brand_cnpj">CNPJ</Label>
                  <Input
                    id="edit_brand_cnpj"
                    value={brandToEdit.brand_cnpj || ""}
                    onChange={(e) => setBrandToEdit({ ...brandToEdit, brand_cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_contact_email">E-mail de Contato</Label>
                  <Input
                    id="edit_contact_email"
                    type="email"
                    value={brandToEdit.contact_email || ""}
                    onChange={(e) => setBrandToEdit({ ...brandToEdit, contact_email: e.target.value })}
                    placeholder="contato@marca.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_plan">Plano</Label>
                  <Select
                    value={brandToEdit.plan}
                    onValueChange={(value) => setBrandToEdit({ ...brandToEdit, plan: value })}
                  >
                    <SelectTrigger id="edit_plan">
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
