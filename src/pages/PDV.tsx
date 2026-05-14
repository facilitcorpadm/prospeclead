import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowLeft, CreditCard, Banknote, QrCode, ShoppingCart, CheckCircle2 } from "lucide-react";

type Step = "list" | "terminal" | "payment" | "success";

interface Venda {
  id: string;
  cliente: string;
  placa: string;
  produto: string;
  valor: number;
  data: string;
  formaPagamento: string;
}

export default function PDV() {
  const [step, setStep] = useState<Step>("list");
  const [vendas, setVendas] = useState<Venda[]>([
    { id: "1", cliente: "João Silva", placa: "ABC-1234", produto: "Plano Anual", valor: 1200, data: "Hoje 14:30", formaPagamento: "Pix" },
    { id: "2", cliente: "Maria Oliveira", placa: "XYZ-9D87", produto: "Rastreador Simples", valor: 450, data: "Hoje 10:15", formaPagamento: "Cartão" },
  ]);

  const [formData, setFormData] = useState({
    cliente: "",
    placa: "",
    produto: "",
    valor: "",
  });

  const handleNext = () => {
    if (step === "terminal") setStep("payment");
    else if (step === "payment") {
      const novaVenda: Venda = {
        id: Math.random().toString(),
        cliente: formData.cliente || "Cliente Balcão",
        placa: formData.placa.toUpperCase(),
        produto: formData.produto,
        valor: parseFloat(formData.valor || "0"),
        data: "Agora mesmo",
        formaPagamento: "Definido no Caixa",
      };
      setVendas([novaVenda, ...vendas]);
      setStep("success");
    }
  };

  const resetPdv = () => {
    setFormData({ cliente: "", placa: "", produto: "", valor: "" });
    setStep("list");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Fixo */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venda Rápida (PDV)</h1>
          <p className="text-muted-foreground">Terminal de balcão para vendas diretas e rápidas.</p>
        </div>
        {step !== "list" && step !== "success" && (
          <Button variant="outline" onClick={() => setStep(step === "payment" ? "terminal" : "list")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
      </div>

      {/* TELA A: Listagem */}
      {step === "list" && (
        <div className="space-y-6">
          <Button size="lg" className="w-full text-lg h-16 shadow-lg" onClick={() => setStep("terminal")}>
            <Plus className="w-6 h-6 mr-2" />
            NOVA VENDA
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Vendas de Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              {vendas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Nenhuma venda registrada hoje.</div>
              ) : (
                <div className="space-y-4">
                  {vendas.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{v.cliente}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{v.placa}</span>
                            <span>• {v.produto}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-emerald-600">R$ {v.valor.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{v.formaPagamento} • {v.data}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TELA B: Terminal de Venda */}
      {step === "terminal" && (
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle>Dados da Venda</CardTitle>
            <CardDescription>Preencha os detalhes do produto e cliente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-base">Produto / Serviço</Label>
                <Select value={formData.produto} onValueChange={(val) => setFormData({ ...formData, produto: val })}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder="Selecione o produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Topy Pro">Topy Pro</SelectItem>
                    <SelectItem value="Rastremix Básico">Rastremix Básico</SelectItem>
                    <SelectItem value="Instalação Avulsa">Instalação Avulsa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Valor (R$)</Label>
                <Input 
                  type="number" 
                  className="h-12 text-lg font-mono" 
                  placeholder="0.00"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Placa do Veículo</Label>
                <Input 
                  className="h-12 text-lg uppercase font-mono" 
                  placeholder="ABC-1234"
                  value={formData.placa}
                  onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Nome do Cliente <span className="text-muted-foreground font-normal text-sm">(Opcional)</span></Label>
                <Input 
                  className="h-12 text-lg" 
                  placeholder="Ex: João da Silva"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                />
              </div>
            </div>
            <Button 
              size="lg" 
              className="w-full h-14 text-lg mt-4" 
              onClick={handleNext}
              disabled={!formData.produto || !formData.valor || !formData.placa}
            >
              Avançar para Pagamento
            </Button>
          </CardContent>
        </Card>
      )}

      {/* TELA C: Pagamento */}
      {step === "payment" && (
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-muted/30 border-b text-center py-8">
            <CardTitle className="text-3xl">Total a Pagar</CardTitle>
            <p className="text-5xl font-bold text-emerald-600 mt-4">R$ {parseFloat(formData.valor || "0").toFixed(2)}</p>
          </CardHeader>
          <CardContent className="p-6">
            <Label className="text-lg mb-4 block text-center">Selecione a forma de pagamento</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-32 flex flex-col gap-3 hover:border-primary hover:bg-primary/5">
                <QrCode className="w-10 h-10 text-emerald-500" />
                <span className="text-lg font-bold">Pix</span>
              </Button>
              <Button variant="outline" className="h-32 flex flex-col gap-3 hover:border-primary hover:bg-primary/5">
                <CreditCard className="w-10 h-10 text-blue-500" />
                <span className="text-lg font-bold">Cartão</span>
              </Button>
              <Button variant="outline" className="h-32 flex flex-col gap-3 hover:border-primary hover:bg-primary/5">
                <Banknote className="w-10 h-10 text-amber-500" />
                <span className="text-lg font-bold">Dinheiro</span>
              </Button>
            </div>
            <Button size="lg" className="w-full h-16 text-xl mt-8 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleNext}>
              Confirmar Pagamento
            </Button>
          </CardContent>
        </Card>
      )}

      {/* TELA SUCESSO */}
      {step === "success" && (
        <Card className="border-2 border-emerald-500 shadow-xl bg-emerald-50/50">
          <CardContent className="flex flex-col items-center text-center py-16 space-y-6">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-16 h-16" />
            </div>
            <h2 className="text-3xl font-bold text-emerald-800">Venda Finalizada!</h2>
            <p className="text-lg text-emerald-600/80">O recibo foi gerado e a venda registrada com sucesso.</p>
            <Button size="lg" variant="outline" className="mt-8 h-12 px-8 font-bold border-emerald-500 text-emerald-700 hover:bg-emerald-100" onClick={resetPdv}>
              Nova Venda
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
