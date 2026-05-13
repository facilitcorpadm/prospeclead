import { useState, useMemo } from "react";
import { 
  Radar, 
  MapPin, 
  Search, 
  Building2, 
  Filter, 
  Map, 
  FileSearch, 
  CheckCircle2, 
  ArrowRight,
  Globe,
  Navigation,
  Database,
  Building,
  Phone,
  Star,
  ExternalLink,
  Plus,
  RefreshCw,
  User,
  ShieldCheck,
  Calendar,
  Wallet
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/* ---------- Tipos ---------- */
interface ProspectResult {
  id: string;
  name: string;
  trading_name?: string;
  cnpj?: string;
  cnae: string;
  category: string;
  address: string;
  phone: string;
  rating: number;
  reviews: number;
  imported: boolean;
  status?: "Aberto" | "Fechado" | string;
}

/* ---------- Dados Estáticos ---------- */
const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const CNAES = [
  { code: "4930-2/01", label: "Transporte rodoviário de carga" },
  { code: "4930-2/02", label: "Transporte rodoviário de carga perigosa" },
  { code: "7711-0/00", label: "Locação de automóveis sem condutor" },
  { code: "4923-0/02", label: "Transporte de passageiros - locação com motorista" },
  { code: "8011-1/01", label: "Vigilância e segurança privada" },
];

const MOCK_RESULTS: ProspectResult[] = [
  {
    id: "1",
    name: "Logística Expressa Brasil Ltda",
    cnpj: "12.345.678/0001-90",
    cnae: "4930-2/01",
    category: "Transportadora",
    address: "Av. das Nações, 1500 - São Paulo, SP",
    phone: "(11) 4002-8922",
    rating: 4.8,
    reviews: 124,
    imported: false,
  },
  {
    id: "2",
    name: "Rent-a-Fleet Soluções Automotivas",
    cnpj: "98.765.432/0001-10",
    cnae: "7711-0/00",
    category: "Locação",
    address: "Rua das Flores, 45 - Belo Horizonte, MG",
    phone: "(31) 3344-5566",
    rating: 4.5,
    reviews: 89,
    imported: true,
  },
  {
    id: "3",
    name: "Segurança Total Vigilância",
    cnpj: "45.678.901/0001-22",
    cnae: "8011-1/01",
    category: "Segurança",
    address: "Rodovia BR-101, Km 20 - Curitiba, PR",
    phone: "(41) 98877-6655",
    rating: 4.2,
    reviews: 56,
    imported: false,
  },
];

/* ---------- Componente Principal ---------- */
export default function AdminRadarB2B() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("map");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProspectResult[]>([]);
  const [cnpjData, setCnpjData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationText, setLocationText] = useState("");

  // Stats
  const totalImported = results.filter(r => r.imported).length;
  const progress = results.length > 0 ? (totalImported / results.length) * 100 : 0;

  /* Handlers */
  const handleSearch = async () => {
    if (!searchTerm) {
      toast({
        title: "Atenção",
        description: "Por favor, informe um termo de busca (ex: Transportadora).",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults([]);
    setCnpjData(null);

    try {
      let locationBias = null;
      let query = searchTerm;

      if (locationText) {
        query += ` em ${locationText}`;
      } else {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });
          
          const { latitude, longitude } = position.coords;
          locationBias = {
            circle: {
              center: { latitude, longitude },
              radius: 5000.0,
            },
          };
        } catch (geoError) {
          console.warn("Localização real indisponível:", geoError);
        }
      }

      // API KEY das variáveis de ambiente
      const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_MAPS_API_KEY) || "";

      if (!apiKey) {
        throw new Error("Chave de API do Google Maps não configurada (VITE_GOOGLE_MAPS_API_KEY).");
      }

      // Carregar a biblioteca do Google Maps dinamicamente se não estiver carregada
      if (!(window as any).google?.maps?.importLibrary) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=beta`;
          script.async = true;
          script.defer = true;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Importar a biblioteca de Places (New)
      const { Place } = await (window as any).google.maps.importLibrary("places") as any;

      const request = {
        textQuery: query,
        fields: ["id", "displayName", "formattedAddress", "nationalPhoneNumber", "rating", "userRatingCount", "businessStatus"],
        locationBias: locationBias,
        languageCode: "pt-BR",
      };

      const { places } = await Place.searchByText(request);

      if (places && places.length > 0) {
        const mappedResults: ProspectResult[] = places.map((place: any) => ({
          id: place.id,
          name: place.displayName || "Empresa sem nome",
          address: place.formattedAddress || "Endereço não disponível",
          phone: place.nationalPhoneNumber || "Não informado",
          rating: place.rating || 0,
          reviews: place.userRatingCount || 0,
          category: searchTerm,
          cnae: "Setor Identificado",
          imported: false,
          status: place.businessStatus === "OPERATIONAL" ? "Aberto" : "Fechado",
        }));
        setResults(mappedResults);
      } else {
        toast({
          title: "Busca finalizada",
          description: "Nenhum resultado encontrado para este termo na região.",
        });
      }
    } catch (error: any) {
      console.error("Erro ao realizar varredura:", error);
      toast({
        title: "Erro na Varredura",
        description: error.message || "Não foi possível completar a busca. Verifique sua chave de API.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCnpjSearch = () => {
    setLoading(true);
    setTimeout(() => {
      setCnpjData({
        razao_social: "LOGISTICA E TRANSPORTES AVANCADOS LTDA",
        nome_fantasia: "LOG-AVANC",
        data_abertura: "15/05/2012",
        cnae_principal: "4930-2/02 - Transporte rodoviário de carga perigosa",
        cnaes_secundarios: ["4930-2/01 - Carga geral", "5211-7/99 - Depósitos"],
        endereco: "Av. Paulista, 1000, 15º Andar - Bela Vista, São Paulo/SP - 01310-100",
        qsa: [
          { nome: "CARLOS EDUARDO SILVA", cargo: "Sócio-Administrador" },
          { nome: "ANA BEATRIZ SANTOS", cargo: "Sócio" }
        ],
        capital_social: "R$ 1.500.000,00"
      });
      setLoading(false);
    }, 2000);
  };

  const handleImport = async (id: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para importar leads.",
        variant: "destructive",
      });
      return;
    }

    const leadToImport = results.find(r => r.id === id);
    if (!leadToImport) return;

    try {
      const { error } = await supabase.from("leads").insert({
        user_id: user.id,
        name: leadToImport.name,
        company_cnpj: leadToImport.cnpj || null,
        phone: leadToImport.phone,
        address: leadToImport.address,
        kind: "b2b",
        status: "prospectado",
        fleet_size: 0,
      });

      if (error) throw error;

      setResults(prev => prev.map(r => r.id === id ? { ...r, imported: true } : r));
      toast({
        title: "Sucesso!",
        description: "Empresa importada com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao importar lead:", error);
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Radar className="w-6 h-6 text-green-600 animate-pulse" />
            Radar B2B — Prospecção Ativa
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Módulo especializado em frotas, logística e serviços corporativos.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 gap-6">
        <Tabs defaultValue="map" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mb-6 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="map" className="rounded-lg gap-2">
              <MapPin className="w-4 h-4" /> Busca no Mapa
            </TabsTrigger>
            <TabsTrigger value="cnae" className="rounded-lg gap-2">
              <Building2 className="w-4 h-4" /> Filtro CNAE
            </TabsTrigger>
            <TabsTrigger value="cnpj" className="rounded-lg gap-2">
              <Building className="w-4 h-4" /> Consultar CNPJ
            </TabsTrigger>
          </TabsList>

          <Card className="p-6 border-border shadow-sm rounded-xl bg-card/50 backdrop-blur-sm">
            {/* TABS CONTENT */}
            <TabsContent value="map" className="mt-0 animate-in slide-in-from-bottom-2 duration-300">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-1 space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Termo de Busca</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Ex: Transportadora, Oficina..." 
                      className="pl-10 h-11" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Cidade / Estado</label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Cidade, UF (ou deixe vazio para sua posição)" 
                      className="pl-10 h-11" 
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleSearch} disabled={loading} className="bg-green-600 hover:bg-green-700 gap-2 h-11 shadow-lg shadow-green-600/20 font-bold uppercase text-xs">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
                  Iniciar Varredura
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="cnae" className="mt-0 animate-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Segmentos Focados em Frotas</label>
                  <Select>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione o segmento CNAE..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CNAES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="font-mono text-xs text-primary mr-2">[{c.code}]</span>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Estado (UF)</label>
                  <Select>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione a UF..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {UFS.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSearch} disabled={loading} className="bg-green-600 hover:bg-green-700 gap-2 h-11 font-bold uppercase text-xs">
                  <Filter className="w-4 h-4" /> Filtrar Base
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="cnpj" className="mt-0 animate-in slide-in-from-bottom-2 duration-300">
              <div className="max-w-3xl space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Consultar CNPJ (Enriquecimento)</label>
                  <div className="flex gap-2">
                    <Input placeholder="00.000.000/0000-00" className="flex-1 h-11" />
                    <Button onClick={handleCnpjSearch} disabled={loading} className="bg-green-600 hover:bg-green-700 gap-2 px-8 h-11 font-bold uppercase text-xs">
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Consultar
                    </Button>
                  </div>
                </div>

                {/* Resultado Enriquecimento */}
                {cnpjData && !loading && (
                  <Card className="p-5 border-border bg-muted/30 rounded-xl space-y-4">
                    <div className="flex items-start justify-between border-b border-border pb-4">
                      <div>
                        <h3 className="text-lg font-bold">{cnpjData.razao_social}</h3>
                        <p className="text-sm text-muted-foreground">{cnpjData.nome_fantasia || "Sem Nome Fantasia"}</p>
                      </div>
                      <Badge className="bg-green-500/10 text-green-600 border-green-200">Ativa</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <DataRow icon={Calendar} label="Abertura" value={cnpjData.data_abertura} />
                        <DataRow icon={ShieldCheck} label="CNAE Principal" value={cnpjData.cnae_principal} />
                        <DataRow icon={Wallet} label="Capital Social" value={cnpjData.capital_social} />
                        <DataRow icon={MapPin} label="Endereço" value={cnpjData.endereco} />
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2 flex items-center gap-1">
                            <User className="w-3 h-3" /> Sócios e Administradores (QSA)
                          </p>
                          <div className="space-y-2">
                            {cnpjData.qsa.map((s: any, i: number) => (
                              <div key={i} className="text-xs p-2 rounded bg-background border border-border">
                                <span className="font-bold">{s.nome}</span> — <span className="text-muted-foreground">{s.cargo}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">CNAEs Secundários</p>
                          <div className="flex flex-wrap gap-1">
                            {cnpjData.cnaes_secundarios.map((s: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px] font-normal">{s.split(" - ")[0]}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                      <Button className="bg-green-600 hover:bg-green-700 gap-2">
                        <Plus className="w-4 h-4" /> Importar Dados Enriquecidos
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Card>
        </Tabs>

        {/* TABELA DE RESULTADOS */}
        {results.length > 0 && !loading && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Empresas Identificadas
              </h2>
              <Badge variant="outline" className="px-3 py-1 bg-muted/50">
                {results.length} resultados encontrados
              </Badge>
            </div>

            <Card className="rounded-xl border-border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNAE / Categoria</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Contatos</TableHead>
                    <TableHead className="text-center">Avaliação</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-lg border border-border shadow-sm">
                            <AvatarFallback className="bg-primary/5 text-primary font-bold text-xs">
                              {r.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold truncate">{r.name}</p>
                              {r.status && (
                                <Badge className={`text-[8px] h-4 px-1 uppercase ${r.status === "Aberto" ? "bg-emerald-500" : "bg-red-500"}`}>
                                  {r.status}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono">{r.cnpj || "CNPJ não disponível"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold text-[10px] bg-accent/30 text-accent-foreground border-accent/20">
                          {r.category}
                        </Badge>
                        <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">{r.cnae}</p>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-[11px] text-muted-foreground leading-tight">{r.address}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-green-500" /> {r.phone}
                          </p>
                          <a href={`https://www.google.com/search?q=${encodeURIComponent(r.name)}`} target="_blank" className="text-[10px] text-primary flex items-center gap-1 hover:underline">
                            <ExternalLink className="w-2.5 h-2.5" /> Busca Direta
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`w-3 h-3 ${s <= Math.floor(r.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted'}`} />
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground font-bold mt-1">{r.rating} ({r.reviews} reviews)</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.imported ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5 py-1.5 px-3">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Importado
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => handleImport(r.id)}
                            className="bg-green-600 hover:bg-green-700 text-[11px] font-bold h-9"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Importar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* RODAPÉ ANALÍTICO */}
              <div className="p-4 bg-muted/20 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full max-w-md space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                    <span>Progresso de Importação</span>
                    <span>{totalImported} de {results.length} Empresas</span>
                  </div>
                  <Progress value={progress} className="h-1.5 bg-background border border-border" />
                </div>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase h-8 px-4">
                     Exportar CSV
                   </Button>
                   <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase h-8 px-4">
                     Ver no CRM
                   </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {results.length === 0 && !loading && (
          <Card className="min-h-[400px] flex flex-col items-center justify-center p-12 border-dashed border-2 border-muted bg-muted/20 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="w-64 h-64 border-2 border-green-400 rounded-full animate-[ping_3s_linear_infinite]" />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center shadow-inner">
                <Radar className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Aguardando Varredura</h3>
                <p className="text-sm text-muted-foreground max-w-xs mt-1">
                  Selecione um método de busca acima e inicie a identificação de empresas no setor de logística e veículos.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-6 py-20 animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-24 h-24 rounded-full border-2 border-green-500/30 animate-[ping_2s_linear_infinite]" />
              <div className="absolute w-16 h-16 rounded-full border-2 border-green-500/50 animate-[ping_3s_linear_infinite]" />
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center shadow-lg shadow-green-600/40 relative z-10">
                <Radar className="w-6 h-6 text-white animate-spin-slow" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-bold text-green-600 uppercase tracking-[0.2em] animate-pulse">Varredura em Tempo Real...</p>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Conectando ao Google Places API</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Sub-componentes ---------- */

function DataRow({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-start gap-2.5 group">
      <div className="w-7 h-7 rounded bg-background border border-border flex items-center justify-center shrink-0 mt-0.5 group-hover:border-primary/30 transition-colors">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter leading-none mb-1">{label}</p>
        <p className="text-xs font-medium text-foreground leading-tight">{value}</p>
      </div>
    </div>
  );
}
