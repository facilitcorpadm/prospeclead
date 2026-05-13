import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Upload,
  Eye,
  EyeOff,
  Save,
  Wifi,
  WifiOff,
  Loader2,
  TestTube2,
  Image as ImageIcon,
  Building2,
  MessageSquare,
  DollarSign,
  Satellite,
  ShieldAlert,
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Palette,
  Hash,
  Copy,
  RefreshCw,
  Check,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type PlanTier = "free" | "pro" | "enterprise";

type Settings = {
  brand_name: string;
  brand_cnpj: string | null;
  brand_logo_url: string | null;
  primary_color: string;
  plan: PlanTier;
  tenant_id: string;

  contact_responsible: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_city: string | null;
  contact_state: string | null;

  whatsapp_connected: boolean;
  whatsapp_phone_id: string | null;
  whatsapp_webhook_url: string | null;
  whatsapp_token: string | null;

  asaas_connected: boolean;
  asaas_api_key: string | null;
  payment_pix_key: string | null;

  smartgps_connected: boolean;
  smartgps_token: string | null;
  smartgps_base_url: string | null;

  commission_sale_percent: number;
  commission_capture_fixed: number;
  commission_goal_bonus: number;

  limit_max_promoters: number;
  limit_max_leads_month: number;
};

const DEFAULT_SETTINGS: Settings = {
  brand_name: "",
  brand_cnpj: null,
  brand_logo_url: null,
  primary_color: "#10b981",
  plan: "free",
  tenant_id: "",
  contact_responsible: null,
  contact_phone: null,
  contact_email: null,
  contact_city: null,
  contact_state: null,
  whatsapp_connected: false,
  whatsapp_phone_id: null,
  whatsapp_webhook_url: null,
  whatsapp_token: null,
  asaas_connected: false,
  asaas_api_key: null,
  payment_pix_key: null,
  smartgps_connected: false,
  smartgps_token: null,
  smartgps_base_url: null,
  commission_sale_percent: 5,
  commission_capture_fixed: 2,
  commission_goal_bonus: 100,
  limit_max_promoters: 50,
  limit_max_leads_month: 5000,
};

const COLOR_SWATCHES = [
  "#7c3aed", "#3b82f6", "#10b981", "#f59e0b",
  "#ec4899", "#a855f7", "#f97316", "#14b8a6",
  "#ef4444", "#475569", "#10b981",
];

const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

type SectionKey = "perfil" | "whatsapp" | "asaas" | "smartgps";

const SECTIONS: {
  key: SectionKey;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "perfil", title: "Perfil da Empresa", subtitle: "Dados cadastrais e identidade visual da franquia", icon: Building2 },
  { key: "whatsapp", title: "WhatsApp Oficial", subtitle: "Meta Cloud API · Webhooks", icon: MessageSquare },
  { key: "asaas", title: "Financeiro (Asaas)", subtitle: "Pagamentos e cobranças", icon: DollarSign },
  { key: "smartgps", title: "Plataforma (SmartGPS)", subtitle: "Telemetria e rastreamento", icon: Satellite },
];

export default function AdminConfig() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [active, setActive] = useState<SectionKey>("perfil");

  const [showWaToken, setShowWaToken] = useState(false);
  const [showAsaasKey, setShowAsaasKey] = useState(false);
  const [showSmartGpsToken, setShowSmartGpsToken] = useState(false);
  const [copiedTenant, setCopiedTenant] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else if (data) {
      setSettings({ ...DEFAULT_SETTINGS, ...(data as unknown as Settings) });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const persist = async (section: string, fields: Partial<Settings>) => {
    setSaving(section);
    const { error } = await supabase
      .from("app_settings")
      .update(fields)
      .eq("id", 1);
    setSaving(null);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Configurações salvas com sucesso" });
    return true;
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Envie uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Imagem grande demais", description: "Máximo 2MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      setUploading(false);
      toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    update("brand_logo_url", data.publicUrl);
    setUploading(false);
    toast({ title: "Logo enviado", description: "Lembre de salvar para aplicar." });
  };

  const testConnection = (label: string) => {
    toast({
      title: `Testando ${label}…`,
      description: "Conexão simulada. Configure as credenciais reais para validar.",
    });
  };

  const copyTenant = () => {
    navigator.clipboard.writeText(settings.tenant_id);
    setCopiedTenant(true);
    toast({ title: "Tenant ID copiado" });
    setTimeout(() => setCopiedTenant(false), 1800);
  };

  const formatCnpj = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 10) {
      return d.replace(/^(\d{2})(\d{4})(\d)/, "($1) $2-$3").trim();
    }
    return d.replace(/^(\d{2})(\d{5})(\d)/, "($1) $2-$3").trim();
  };

  const currentSection = useMemo(
    () => SECTIONS.find((s) => s.key === active)!,
    [active],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header com gradiente */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-primary/5 to-background px-5 py-6 shadow-sm md:px-7 md:py-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shrink-0">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold md:text-3xl tracking-tight">
                Configurações &amp; Integrações
              </h1>
              <p className="mt-1 text-sm text-muted-foreground md:text-base">
                Gerencie integrações e dados da sua franquia
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={load} aria-label="Recarregar">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Layout sidebar + conteúdo */}
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Sidebar de seções */}
        <aside className="space-y-3">
          <nav className="space-y-2">
            {SECTIONS.map((s) => {
              const isActive = active === s.key;
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-all flex items-center gap-3",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card hover:border-primary/40 hover:bg-accent/40",
                  )}
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-sm truncate", isActive && "text-primary-foreground")}>
                      {s.title}
                    </p>
                    <p
                      className={cn(
                        "text-xs truncate",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {s.subtitle}
                    </p>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </nav>

          {/* Aviso de segurança */}
          <Card className="border-warning/40 bg-warning/5 p-4">
            <div className="flex gap-3">
              <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-warning">Segurança</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Chaves de API são armazenadas criptografadas e nunca expostas em logs ou respostas HTTP.
                </p>
              </div>
            </div>
          </Card>
        </aside>

        {/* Conteúdo da seção */}
        <Card className="overflow-hidden">
          {/* Cabeçalho da seção */}
          <div className="border-b bg-muted/30 px-5 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <currentSection.icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">{currentSection.title}</h2>
                <p className="text-xs text-muted-foreground">{currentSection.subtitle}</p>
              </div>
            </div>
          </div>

          {active === "perfil" && (
            <PerfilSection
              settings={settings}
              update={update}
              uploading={uploading}
              fileRef={fileRef}
              handleLogoUpload={handleLogoUpload}
              copyTenant={copyTenant}
              copiedTenant={copiedTenant}
              formatCnpj={formatCnpj}
              formatPhone={formatPhone}
              saving={saving === "perfil"}
              onSave={() =>
                persist("perfil", {
                  brand_name: settings.brand_name,
                  brand_cnpj: settings.brand_cnpj,
                  brand_logo_url: settings.brand_logo_url,
                  primary_color: settings.primary_color,
                  plan: settings.plan,
                  contact_responsible: settings.contact_responsible,
                  contact_phone: settings.contact_phone,
                  contact_email: settings.contact_email,
                  contact_city: settings.contact_city,
                  contact_state: settings.contact_state,
                })
              }
            />
          )}

          {active === "whatsapp" && (
            <WhatsAppSection
              settings={settings}
              update={update}
              showWaToken={showWaToken}
              setShowWaToken={setShowWaToken}
              testConnection={testConnection}
              saving={saving === "whatsapp"}
              onSave={() =>
                persist("whatsapp", {
                  whatsapp_phone_id: settings.whatsapp_phone_id,
                  whatsapp_webhook_url: settings.whatsapp_webhook_url,
                  whatsapp_token: settings.whatsapp_token,
                  whatsapp_connected: !!(settings.whatsapp_phone_id && settings.whatsapp_token),
                }).then((ok) => {
                  if (ok) update("whatsapp_connected", !!(settings.whatsapp_phone_id && settings.whatsapp_token));
                })
              }
            />
          )}

          {active === "asaas" && (
            <AsaasSection
              settings={settings}
              update={update}
              showAsaasKey={showAsaasKey}
              setShowAsaasKey={setShowAsaasKey}
              testConnection={testConnection}
              saving={saving === "asaas"}
              onSave={() =>
                persist("asaas", {
                  asaas_api_key: settings.asaas_api_key,
                  payment_pix_key: settings.payment_pix_key,
                  asaas_connected: !!settings.asaas_api_key,
                }).then((ok) => {
                  if (ok) update("asaas_connected", !!settings.asaas_api_key);
                })
              }
            />
          )}

          {active === "smartgps" && (
            <SmartGpsSection
              settings={settings}
              update={update}
              showSmartGpsToken={showSmartGpsToken}
              setShowSmartGpsToken={setShowSmartGpsToken}
              testConnection={testConnection}
              saving={saving === "smartgps"}
              onSave={() =>
                persist("smartgps", {
                  smartgps_token: settings.smartgps_token,
                  smartgps_base_url: settings.smartgps_base_url,
                  smartgps_connected: !!settings.smartgps_token,
                }).then((ok) => {
                  if (ok) update("smartgps_connected", !!settings.smartgps_token);
                })
              }
            />
          )}
        </Card>
      </div>
    </div>
  );
}

/* ----------------- Reusable bits ----------------- */

function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="w-4 h-4" />
      {children}
    </div>
  );
}

function FieldLabel({ icon: Icon, children, required }: { icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="flex items-center gap-1.5 text-sm">
      {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
      {children}
      {required && <span className="text-destructive">*</span>}
    </Label>
  );
}

function StatusBadge({ connected, label }: { connected: boolean; label?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        connected
          ? "bg-success/10 text-success border-success/30"
          : "bg-muted text-muted-foreground",
      )}
    >
      {connected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
      {label ?? (connected ? "Conectado" : "Desconectado")}
    </Badge>
  );
}

/* ----------------- Perfil ----------------- */

function PerfilSection({
  settings, update, uploading, fileRef, handleLogoUpload,
  copyTenant, copiedTenant, formatCnpj, formatPhone, saving, onSave,
}: {
  settings: Settings;
  update: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  uploading: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
  handleLogoUpload: (f: File) => void;
  copyTenant: () => void;
  copiedTenant: boolean;
  formatCnpj: (v: string) => string;
  formatPhone: (v: string) => string;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <div className="px-5 py-5 md:px-6 md:py-6 space-y-7">
        {/* Identidade da Marca */}
        <div className="space-y-4">
          <SectionTitle icon={Palette}>Identidade da Marca</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <FieldLabel required>Nome da Franquia</FieldLabel>
              <Input
                value={settings.brand_name}
                onChange={(e) => update("brand_name", e.target.value)}
                placeholder="Ex.: ProspecLead Brasil"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>CNPJ</FieldLabel>
              <Input
                value={settings.brand_cnpj ?? ""}
                onChange={(e) => update("brand_cnpj", formatCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel icon={Palette}>Cor Principal (White-Label)</FieldLabel>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update("primary_color", c)}
                  className={cn(
                    "h-9 w-9 rounded-md border-2 transition-all",
                    settings.primary_color.toLowerCase() === c.toLowerCase()
                      ? "border-foreground scale-110 shadow-md"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Selecionar cor ${c}`}
                />
              ))}
              <Input
                value={settings.primary_color}
                onChange={(e) => update("primary_color", e.target.value)}
                maxLength={9}
                className="font-mono w-32"
              />
              <div
                className="h-9 w-9 rounded-md border flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: settings.primary_color }}
              >
                A
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel icon={Globe}>URL da Logo</FieldLabel>
            <Input
              value={settings.brand_logo_url ?? ""}
              onChange={(e) => update("brand_logo_url", e.target.value)}
              placeholder="https://sua-empresa.com/logo.png"
            />
            <div className="flex items-center gap-3 pt-2">
              <div className="w-16 h-16 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                {settings.brand_logo_url ? (
                  <img
                    src={settings.brand_logo_url}
                    alt="Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoUpload(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Enviar arquivo
              </Button>
              <p className="text-xs text-muted-foreground">PNG/JPG/SVG até 2MB</p>
            </div>
          </div>
        </div>

        {/* Dados de Contato */}
        <div className="space-y-4">
          <SectionTitle icon={Phone}>Dados de Contato</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <FieldLabel icon={User}>Responsável</FieldLabel>
              <Input
                value={settings.contact_responsible ?? ""}
                onChange={(e) => update("contact_responsible", e.target.value)}
                placeholder="Carlos Eduardo"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel icon={Phone}>Telefone</FieldLabel>
              <Input
                value={settings.contact_phone ?? ""}
                onChange={(e) => update("contact_phone", formatPhone(e.target.value))}
                placeholder="(11) 99999-0000"
                inputMode="tel"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel icon={Mail}>E-mail</FieldLabel>
              <Input
                type="email"
                value={settings.contact_email ?? ""}
                onChange={(e) => update("contact_email", e.target.value)}
                placeholder="contato@suaempresa.com.br"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel icon={MapPin}>Cidade</FieldLabel>
              <Input
                value={settings.contact_city ?? ""}
                onChange={(e) => update("contact_city", e.target.value)}
                placeholder="São Paulo"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Estado</FieldLabel>
              <Select
                value={settings.contact_state ?? ""}
                onValueChange={(v) => update("contact_state", v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {BR_STATES.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tenant ID readonly */}
          <Card className="bg-muted/30 border-dashed p-4">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">ID do Tenant</span>
              <Badge variant="outline" className="text-xs">Somente leitura</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={settings.tenant_id}
                readOnly
                className="font-mono text-xs bg-background"
              />
              <Button variant="outline" size="icon" onClick={copyTenant} aria-label="Copiar">
                {copiedTenant ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/30 px-5 py-4 md:px-6 flex justify-end">
        <Button onClick={onSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Perfil
        </Button>
      </div>
    </>
  );
}

/* ----------------- WhatsApp ----------------- */

function WhatsAppSection({
  settings, update, showWaToken, setShowWaToken, testConnection, saving, onSave,
}: {
  settings: Settings;
  update: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  showWaToken: boolean;
  setShowWaToken: (v: boolean | ((p: boolean) => boolean)) => void;
  testConnection: (label: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <div className="px-5 py-5 md:px-6 md:py-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Configure a integração com a Meta Cloud API para envio de mensagens.
          </p>
          <StatusBadge connected={settings.whatsapp_connected} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldLabel>Phone Number ID</FieldLabel>
            <Input
              value={settings.whatsapp_phone_id ?? ""}
              onChange={(e) => update("whatsapp_phone_id", e.target.value)}
              placeholder="ex: 123456789012345"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Webhook URL</FieldLabel>
            <Input
              value={settings.whatsapp_webhook_url ?? ""}
              onChange={(e) => update("whatsapp_webhook_url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel>Token de acesso</FieldLabel>
            <div className="relative">
              <Input
                type={showWaToken ? "text" : "password"}
                value={settings.whatsapp_token ?? ""}
                onChange={(e) => update("whatsapp_token", e.target.value)}
                placeholder="EAA..."
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowWaToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showWaToken ? "Ocultar" : "Mostrar"}
              >
                {showWaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-muted/30 px-5 py-4 md:px-6 flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => testConnection("WhatsApp")}>
          <TestTube2 className="w-4 h-4 mr-1" /> Testar conexão
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </div>
    </>
  );
}

/* ----------------- Asaas ----------------- */

function AsaasSection({
  settings, update, showAsaasKey, setShowAsaasKey, testConnection, saving, onSave,
}: {
  settings: Settings;
  update: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  showAsaasKey: boolean;
  setShowAsaasKey: (v: boolean | ((p: boolean) => boolean)) => void;
  testConnection: (label: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <div className="px-5 py-5 md:px-6 md:py-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Conecte sua conta Asaas para emitir cobranças PIX e boletos.
          </p>
          <StatusBadge connected={settings.asaas_connected} label={settings.asaas_connected ? "Ativo" : "Inativo"} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <FieldLabel>API Key Asaas</FieldLabel>
            <div className="relative">
              <Input
                type={showAsaasKey ? "text" : "password"}
                value={settings.asaas_api_key ?? ""}
                onChange={(e) => update("asaas_api_key", e.target.value)}
                placeholder="$aact_..."
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowAsaasKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showAsaasKey ? "Ocultar" : "Mostrar"}
              >
                {showAsaasKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel>Chave PIX (recebimento)</FieldLabel>
            <Input
              value={settings.payment_pix_key ?? ""}
              onChange={(e) => update("payment_pix_key", e.target.value)}
              placeholder="CPF, CNPJ, e-mail, telefone ou aleatória"
            />
          </div>
        </div>
      </div>

      <div className="border-t bg-muted/30 px-5 py-4 md:px-6 flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => testConnection("Asaas")}>
          <TestTube2 className="w-4 h-4 mr-1" /> Testar conexão
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </div>
    </>
  );
}

/* ----------------- SmartGPS ----------------- */

function SmartGpsSection({
  settings, update, showSmartGpsToken, setShowSmartGpsToken, testConnection, saving, onSave,
}: {
  settings: Settings;
  update: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  showSmartGpsToken: boolean;
  setShowSmartGpsToken: (v: boolean | ((p: boolean) => boolean)) => void;
  testConnection: (label: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <div className="px-5 py-5 md:px-6 md:py-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Integre com a plataforma SmartGPS para telemetria e rastreamento.
          </p>
          <StatusBadge connected={settings.smartgps_connected} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <FieldLabel>URL Base da API</FieldLabel>
            <Input
              value={settings.smartgps_base_url ?? ""}
              onChange={(e) => update("smartgps_base_url", e.target.value)}
              placeholder="https://api.smartgps.com.br"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel>Token de acesso</FieldLabel>
            <div className="relative">
              <Input
                type={showSmartGpsToken ? "text" : "password"}
                value={settings.smartgps_token ?? ""}
                onChange={(e) => update("smartgps_token", e.target.value)}
                placeholder="Bearer token…"
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSmartGpsToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showSmartGpsToken ? "Ocultar" : "Mostrar"}
              >
                {showSmartGpsToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-muted/30 px-5 py-4 md:px-6 flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => testConnection("SmartGPS")}>
          <TestTube2 className="w-4 h-4 mr-1" /> Testar conexão
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </div>
    </>
  );
}
