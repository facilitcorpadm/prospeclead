import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, ShieldCheck, Phone, Key, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function WhatsAppConfig() {
  const [token, setToken] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const { data, error } = await (supabase as any)
        .from("system_settings")
        .select("*");

      if (error) throw error;

      data?.forEach((item: any) => {
        if (item.key === "WHATSAPP_TOKEN") setToken(item.value);
        if (item.key === "WHATSAPP_PHONE_NUMBER_ID") setPhoneId(item.value);
        if (item.key === "WHATSAPP_BUSINESS_ACCOUNT_ID") setBusinessId(item.value);
        if (item.key === "WHATSAPP_VERIFY_TOKEN") setVerifyToken(item.value);
      });
    } catch (error) {
      console.error("Erro ao carregar configs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updates = [
        { key: "WHATSAPP_TOKEN", value: token },
        { key: "WHATSAPP_PHONE_NUMBER_ID", value: phoneId },
        { key: "WHATSAPP_BUSINESS_ACCOUNT_ID", value: businessId },
        { key: "WHATSAPP_VERIFY_TOKEN", value: verifyToken },
      ];

      for (const update of updates) {
        const { error } = await (supabase as any)
          .from("system_settings")
          .upsert(update);
        if (error) throw error;
      }

      toast.success("Configurações do WhatsApp atualizadas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie suas credenciais da Meta API diretamente por aqui.</p>
        </div>
        <div className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-2 text-primary font-medium text-sm border border-primary/20">
          <ShieldCheck className="w-4 h-4" />
          Conexão Direta (Meta v25.0)
        </div>
      </div>

      <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="font-bold">Atenção</AlertTitle>
        <AlertDescription>
          Estas são credenciais mestre. Certifique-se de que está colando o <strong>Token Permanente</strong> gerado no Gerenciador de Negócios da Meta para evitar quedas no serviço.
        </AlertDescription>
      </Alert>

      <Card className="border-2">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Credenciais Oficiais
          </CardTitle>
          <CardDescription>
            Insira os dados obtidos no painel de desenvolvedor da Meta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="token" className="font-bold">Access Token (Permanente)</Label>
            <div className="relative">
              <Input
                id="token"
                type="password"
                placeholder="EAAN..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-xs pr-10"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-0 top-0 h-full"
                onClick={() => setToken("")}
              >
                ✕
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inicia com "EAA..."</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneId" className="font-bold">Phone Number ID</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phoneId"
                placeholder="Ex: 1080720531792247"
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Identificador numérico do seu telefone na Meta</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessId" className="font-bold">Business Account ID</Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="businessId"
                placeholder="Ex: 952649557371257"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ID da sua conta de negócios na Meta</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verifyToken" className="font-bold">Webhook Verify Token</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="verifyToken"
                placeholder="Ex: prospeclead_2026_..."
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Token para validação do webhook na configuração da Meta</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={fetchConfig} disabled={saving}>
          Descartar Alterações
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 px-8">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Credenciais Oficiais
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="bg-blue-100 p-2 rounded-lg h-fit">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-blue-900">Segurança de Dados</h4>
                <p className="text-xs text-blue-800/70 mt-1">Suas chaves são armazenadas com criptografia de ponta a ponta no servidor do Supabase.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg h-fit">
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-emerald-900">Ativação Instantânea</h4>
                <p className="text-xs text-emerald-800/70 mt-1">Ao salvar, o sistema vira a chave para o número oficial em menos de 1 segundo.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
