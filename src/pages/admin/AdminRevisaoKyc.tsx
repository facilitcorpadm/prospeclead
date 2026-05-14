import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { AlertTriangle, Users, Clock, CheckCircle2, XCircle, ArrowRight, Paperclip, Edit } from "lucide-react";

type KycStatus = "Aguardando Revisão" | "Verificado" | "Rejeitado";

interface Promoter {
  id: string;
  name: string;
  email: string;
  brand: string;
  cpf: string;
  kyc: KycStatus;
  pix: string;
  doc: "Sem doc" | "Enviado";
}

const mockData: Promoter[] = [
  { id: "1", name: "Ana Silva", email: "ana.silva@rastremix.com", brand: "Rastremix", cpf: "123.456.789-01", kyc: "Aguardando Revisão", pix: "Aguardando Revisão", doc: "Sem doc" },
  { id: "2", name: "João Costa", email: "joao.costa@rastremix.com", brand: "Rastremix", cpf: "234.567.890-12", kyc: "Aguardando Revisão", pix: "E-mail", doc: "Enviado" },
  { id: "3", name: "Mariana Ramos", email: "mariana@valeteck.com", brand: "Valeteck", cpf: "345.678.901-23", kyc: "Verificado", pix: "✓ Verificado", doc: "Enviado" },
  { id: "4", name: "Lucas Ferreira", email: "lucas@valeteck.com", brand: "Valeteck", cpf: "456.789.012-34", kyc: "Aguardando Revisão", pix: "Sem Pix", doc: "Sem doc" },
  { id: "5", name: "Beatriz Promotora", email: "beatriz@valeteck.com", brand: "Valeteck", cpf: "567.890.123-45", kyc: "Rejeitado", pix: "✓ Verificado", doc: "Enviado" },
];

function getInitials(name: string) {
  const parts = name.split(" ");
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

export default function AdminRevisaoKyc() {
  const [filter, setFilter] = useState<"Todos" | KycStatus>("Todos");

  const filteredData = mockData.filter(item => filter === "Todos" || item.kyc === filter);

  const stats = {
    total: mockData.length,
    pendentes: mockData.filter(d => d.kyc === "Aguardando Revisão").length,
    verificados: mockData.filter(d => d.kyc === "Verificado").length,
    rejeitados: mockData.filter(d => d.kyc === "Rejeitado").length,
  };

  const getKycBadge = (status: KycStatus) => {
    switch (status) {
      case "Verificado": return <Badge className="bg-emerald-500 hover:bg-emerald-600">Verificado</Badge>;
      case "Rejeitado": return <Badge variant="destructive">Rejeitado</Badge>;
      case "Aguardando Revisão": return <Badge className="bg-amber-500 hover:bg-amber-600">Aguardando Revisão</Badge>;
    }
  };

  const getPixBadge = (pix: string) => {
    if (pix === "Sem Pix") return <Badge variant="destructive" className="bg-red-600 text-[10px] uppercase font-bold">Sem Pix</Badge>;
    if (pix.includes("Verificado")) return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] uppercase font-bold">{pix}</Badge>;
    return <span className="text-sm text-muted-foreground font-medium">{pix}</span>;
  };

  const getDocBadge = (doc: string) => {
    if (doc === "Enviado") {
      return (
        <span className="flex items-center gap-1 text-sm text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
          <Paperclip className="w-3.5 h-3.5" /> Enviado
        </span>
      );
    }
    return <span className="text-sm text-muted-foreground">{doc}</span>;
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* 1. Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revisão KYC</h1>
        <p className="text-muted-foreground mt-1">Validação de documentos e dados bancários</p>
      </div>

      {/* 2. Banner de Alerta */}
      <Alert className="bg-amber-50 border-amber-500/50 text-amber-900 shadow-sm">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertTitle className="font-bold text-amber-800">Atenção Necessária</AlertTitle>
        <AlertDescription className="font-medium">
          1 promotor sem dados Pix cadastrados — pagamentos bloqueados.
        </AlertDescription>
      </Alert>

      {/* 3. Cartões de Resumo (KPIs Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-sm border-amber-200 bg-amber-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Pendentes</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{stats.pendentes}</div>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-sm border-emerald-200 bg-emerald-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Verificados</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{stats.verificados}</div>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-sm border-red-200 bg-red-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Rejeitados</CardTitle>
            <XCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{stats.rejeitados}</div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Filtros por Abas */}
      <div className="flex gap-2 bg-muted/50 p-1 rounded-lg w-fit border shadow-inner">
        {(["Todos", "Aguardando Revisão", "Verificado", "Rejeitado"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
              filter === tab 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab === "Aguardando Revisão" ? "Pendentes" : tab}
          </button>
        ))}
      </div>

      {/* 5. Tabela de Controle KYC */}
      <Card className="border-2 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Promotor</TableHead>
                <TableHead className="font-bold">CPF</TableHead>
                <TableHead className="font-bold">KYC</TableHead>
                <TableHead className="font-bold">Pix</TableHead>
                <TableHead className="font-bold">Doc</TableHead>
                <TableHead className="text-right font-bold">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {getInitials(row.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm leading-tight">{row.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={row.email}>
                            {row.email}
                          </span>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border">
                            {row.brand}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {row.cpf}
                  </TableCell>
                  <TableCell>
                    {getKycBadge(row.kyc)}
                  </TableCell>
                  <TableCell>
                    {getPixBadge(row.pix)}
                  </TableCell>
                  <TableCell>
                    {getDocBadge(row.doc)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.kyc === "Aguardando Revisão" ? (
                      <Button size="sm" className="font-semibold shadow-sm">
                        Revisar <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="font-semibold shadow-sm">
                        <Edit className="w-4 h-4 mr-1" /> Editar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum registro encontrado para este filtro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 7. Rodapé */}
      <p className="text-sm text-muted-foreground mt-4 pl-1">
        {filteredData.length} registro(s).
      </p>
    </div>
  );
}
