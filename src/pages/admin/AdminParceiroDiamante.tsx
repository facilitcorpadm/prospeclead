import { useState, useEffect } from "react";
import { 
  Diamond, 
  Building2, 
  MapPin, 
  Users, 
  UserPlus, 
  X, 
  Camera, 
  Smartphone, 
  Fuel, 
  Rocket, 
  RefreshCw,
  Search,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ---------- Hook Reutilizável: Busca CNPJ ---------- */
export function useCNPJLookup() {
  const [loading, setLoading] = useState(false);

  const lookup = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return null;

    setLoading(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) throw new Error("CNPJ não encontrado");
      const data = await response.json();
      return data;
    } catch (error) {
      toast.error("Erro ao buscar CNPJ. Verifique os dados.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { lookup, loading };
}

/* ---------- Componente Principal ---------- */
export default function ParceiroDiamante() {
  const { lookup, loading: fetchingCnpj } = useCNPJLookup();
  const [busy, setBusy] = useState(false);

  // Estados do Formulário
  const [cnpj, setCnpj] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [commission, setCommission] = useState("0.50");
  
  // Gestão de Equipe (Vendedores)
  const [newSeller, setNewSeller] = useState("");
  const [sellers, setSellers] = useState<string[]>([]);

  // Monitor de Auto-fill do CNPJ
  useEffect(() => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length === 14) {
      handleAutoFill();
    }
  }, [cnpj]);

  const handleAutoFill = async () => {
    const data = await lookup(cnpj);
    if (data) {
      setName(data.razao_social || "");
      const fullAddress = `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio}/${data.uf}`;
      setAddress(fullAddress);
      toast.success("Dados da empresa preenchidos automaticamente! ✨");
    }
  };

  const addSeller = () => {
    if (!newSeller.trim()) return;
    if (sellers.includes(newSeller.trim())) {
      toast.error("Vendedor já adicionado.");
      return;
    }
    setSellers([...sellers, newSeller.trim()]);
    setNewSeller("");
    toast.success("Vendedor vinculado!");
  };

  const removeSeller = (name: string) => {
    setSellers(sellers.filter(s => s !== name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    // Simulação de salvamento
    setTimeout(() => {
      setBusy(false);
      toast.success("Parceiro Diamante cadastrado com sucesso! 🎉");
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header Visual */}
      <div className="flex flex-col items-center text-center space-y-2 py-6">
        <div className="w-16 h-16 rounded-3xl bg-[#206de2]/10 flex items-center justify-center text-[#206de2] shadow-inner">
          <Diamond className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight uppercase">Cadastro Parceiro Diamante</h1>
        <p className="text-sm text-muted-foreground">Credenciamento de unidades físicas com gestão de equipe exclusiva.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* BLOCO 1: Dados da Empresa (Com Auto-fill) */}
        <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#206de2] border-b border-muted pb-3">
            <Building2 className="w-5 h-5" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Dados da Empresa</h2>
          </div>

          <div className="grid gap-4">
            <div className="relative">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">CNPJ do Estabelecimento</Label>
              <div className="relative mt-1">
                <Input 
                  value={cnpj} 
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "").slice(0, 14);
                    if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
                    setCnpj(v);
                  }}
                  placeholder="00.000.000/0000-00" 
                  className="h-12 rounded-xl pl-4 pr-12 font-mono"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {fetchingCnpj ? (
                    <RefreshCw className="w-5 h-5 text-[#206de2] animate-spin" />
                  ) : (
                    <Search className="w-5 h-5 text-muted-foreground opacity-30" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Razão Social / Nome Fantasia</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Preenchimento automático via BrasilAPI" 
                className={`h-12 rounded-xl bg-muted/20 transition-all ${fetchingCnpj ? 'opacity-50' : ''}`}
                readOnly={fetchingCnpj}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Endereço Completo</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Logradouro, Número, Bairro, Cidade/UF" 
                  className="h-12 rounded-xl pl-10 bg-muted/20"
                  required
                />
              </div>
            </div>
          </div>
        </Card>

        {/* BLOCO 2: Gestão de Equipe (Vendedores) */}
        <Card className="p-6 rounded-2xl border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#206de2] border-b border-muted pb-3">
            <Users className="w-5 h-5" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Equipe de Vendas (PDV)</h2>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  value={newSeller}
                  onChange={(e) => setNewSeller(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSeller())}
                  placeholder="Nome do vendedor..." 
                  className="h-12 rounded-xl pl-10"
                />
              </div>
              <Button 
                type="button" 
                onClick={addSeller}
                className="h-12 bg-[#206de2] hover:bg-[#206de2]/90 rounded-xl px-6 font-bold"
              >
                ADICIONAR
              </Button>
            </div>

            {/* Listagem de Chips */}
            <div className="flex flex-wrap gap-2 min-h-[50px] p-2 bg-muted/10 rounded-xl border border-dashed border-muted">
              {sellers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic p-2">Nenhum vendedor adicionado ainda.</p>
              ) : (
                sellers.map((seller) => (
                  <Badge 
                    key={seller} 
                    className="bg-white border-border text-foreground hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm group"
                  >
                    <span className="font-bold text-xs">{seller}</span>
                    <X 
                      className="w-3.5 h-3.5 cursor-pointer opacity-50 group-hover:opacity-100" 
                      onClick={() => removeSeller(seller)}
                    />
                  </Badge>
                ))
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Cada vendedor terá um link único de atribuição de leads vinculado a este PDV.</p>
          </div>
        </Card>

        {/* BLOCO 3: Fotos e Configuração */}
        <Card className="p-6 rounded-2xl border-border shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-[#206de2] border-b border-muted pb-3">
            <Camera className="w-5 h-5" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Fotos e Parâmetros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase text-muted-foreground">WhatsApp da Unidade</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  value={whatsapp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                    let masked = val;
                    if (val.length > 2) masked = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                    if (val.length > 7) masked = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                    setWhatsapp(masked);
                  }}
                  placeholder="(00) 00000-0000" 
                  className="h-12 rounded-xl pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Comissão por Lead (R$)</Label>
              <div className="relative">
                <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="0,50" 
                  className="h-12 rounded-xl pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
             <div className="w-full h-32 border-2 border-dashed border-muted rounded-2xl flex flex-col items-center justify-center gap-2 bg-muted/10 hover:bg-muted/20 transition-all cursor-pointer">
                <Camera className="w-8 h-8 text-muted-foreground" />
                <p className="text-xs font-bold text-muted-foreground uppercase">Upload da Foto de Fachada</p>
             </div>
          </div>
        </Card>

        {/* Botão de Finalização */}
        <Button 
          type="submit" 
          disabled={busy}
          className="w-full h-16 rounded-2xl bg-[#206de2] hover:bg-[#206de2]/90 text-white font-black text-lg gap-3 shadow-xl shadow-blue-500/20"
        >
          {busy ? (
            <RefreshCw className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Rocket className="w-6 h-6" />
              FINALIZAR CREDENCIAMENTO DIAMANTE
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
