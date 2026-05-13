import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Car, Truck, Phone, Trash2, Save, Check, MessageCircle, X } from "lucide-react";
import { openWhatsApp, normalizePhoneBR } from "@/lib/whatsapp";
import { useProfile } from "@/hooks/useProfile";

import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

const B2C_FLOW: LeadStatus[] = ["prospectado", "contatado", "respondido", "vendido"];
const B2B_FLOW: LeadStatus[] = ["prospectado", "contatado", "negociando", "fechado"];

const statusColors: Record<string, string> = {
  prospectado: "bg-muted text-muted-foreground",
  contatado: "bg-brand-blue/15 text-brand-blue",
  respondido: "bg-warning/15 text-warning",
  vendido: "bg-success/15 text-success",
  negociando: "bg-warning/15 text-warning",
  fechado: "bg-success/15 text-success",
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Lead>>({});

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        if (data) {
          setLead(data);
          setForm(data);
        }
        setLoading(false);
      });
  }, [user, id]);

  const update = (patch: Partial<Lead>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!lead) return;
    const phoneDigits = (form.phone ?? "").replace(/\D/g, "");
    if (phoneDigits.length !== 11) {
      toast.error("WhatsApp inválido! Digite o DDD + 9 + Número (Ex: 98 9 8462-9959)");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("leads")
      .update({
        name: form.name,
        phone: form.phone,
        vehicle_model: form.vehicle_model,
        vehicle_plate: form.vehicle_plate,
        company_cnpj: form.company_cnpj,
        fleet_size: form.fleet_size,
        city: form.city,
      })
      .eq("id", lead.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Lead atualizado");
      setLead({ ...lead, ...form } as Lead);
    }
  };

  const handleStatusChange = async (status: LeadStatus) => {
    if (!lead) return;
    const { error } = await supabase.from("leads").update({ status }).eq("id", lead.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLead({ ...lead, status });
    setForm((f) => ({ ...f, status }));
    toast.success(`Status: ${status}`);
  };

  const handleDelete = async () => {
    if (!lead) return;
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Lead excluído");
      navigate(`/leads?tab=${lead.kind}`, { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-32 bg-muted animate-pulse rounded-2xl" />
        <div className="h-64 bg-muted animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-muted-foreground">Lead não encontrado</p>
        <Button asChild variant="outline">
          <Link to="/leads">Voltar para leads</Link>
        </Button>
      </div>
    );
  }

  const flow = lead.kind === "b2c" ? B2C_FLOW : B2B_FLOW;
  const banner = lead.kind === "b2c" ? "bg-gradient-leads" : "bg-gradient-b2b";
  const Icon = lead.kind === "b2c" ? Car : Truck;
  const currentIdx = flow.indexOf(lead.status);

  return (
    <div className="pb-6">
      {/* Header */}
      <div className={`${banner} text-primary-foreground px-4 pt-6 pb-8 rounded-b-3xl space-y-4`}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm opacity-90 hover:opacity-100"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{lead.name}</h1>
            <Badge className={`${statusColors[lead.status]} border-0 capitalize mt-1`}>
              {lead.status === "vendido" ? "Lead" : lead.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Progresso de Ganhos Gamificado 3D */}
        <Card className="p-5 space-y-4 bg-gradient-to-br from-white to-gray-50 border-t-4 border-t-emerald-500 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          
          <div className="flex items-center justify-between relative z-10">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
              Ganhos Atuais
            </h2>
            <div className="flex flex-col items-end">
              <span className="text-2xl font-black text-emerald-600 drop-shadow-sm">
                R$ {((0.50) + (lead.photo_url ? 0.25 : 0) + (lead.whatsapp_engaged ? 0.25 : 0)).toFixed(2).replace('.', ',')}
              </span>
              <span className="text-[9px] text-emerald-500/60 font-bold uppercase">Saldo deste lead</span>
            </div>
          </div>
          
          <div className="flex items-start justify-between relative pt-4 pb-2">
            {/* Linha de fundo 3D */}
            <div className="absolute top-[34px] left-[10%] w-[80%] h-2 bg-gray-100 rounded-full shadow-inner" />
            
            {[
              { id: "base", label: "Cadastro", achieved: true, value: 0.50 },
              { id: "photo", label: "Foto Placa", achieved: Boolean(lead.photo_url), value: 0.25 },
              { id: "whatsapp", label: "Engajamento", achieved: Boolean(lead.whatsapp_engaged), value: 0.25 },
            ].map((step, idx, arr) => (
              <div key={step.id} className="flex flex-col items-center w-1/3 relative z-10">
                {/* Barra de progresso 3D preenchida */}
                {idx < arr.length - 1 && step.achieved && arr[idx + 1].achieved && (
                  <div className="absolute top-[18px] left-[50%] w-full h-2 bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_2px_10px_rgba(16,185,129,0.3)] rounded-full" />
                )}
                
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${
                  step.achieved 
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rotate-0 scale-110 shadow-emerald-200' 
                    : 'bg-white border-2 border-gray-100 text-gray-300 scale-90 opacity-60'
                }`}>
                  {step.achieved 
                    ? <Check className="w-6 h-6 stroke-[4] drop-shadow-md" /> 
                    : <X className="w-5 h-5 stroke-[3]" />
                  }
                </div>
                
                <div className="mt-3 flex flex-col items-center">
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${step.achieved ? 'text-gray-800' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                  <div className={`mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold ${
                    step.achieved ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-400'
                  }`}>
                    + R$ {step.value.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Pipeline */}
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Pipeline
          </h2>
          <div className="flex items-center gap-1">
            {flow.map((s, i) => {
              const done = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={s} className="flex-1 flex items-center">
                  <button
                    onClick={() => handleStatusChange(s)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition shrink-0 ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                    title={s}
                  >
                    {done ? <Check className="w-4 h-4" /> : i + 1}
                  </button>
                  {i < flow.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 ${
                        i < currentIdx ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-4 gap-1 text-[10px] text-center capitalize text-muted-foreground">
            {flow.map((s) => (
              <span key={s} className={s === lead.status ? "text-primary font-semibold" : ""}>
                {s === "vendido" ? "Lead" : s}
              </span>
            ))}
          </div>
        </Card>

        {/* Form */}
        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Informações
          </h2>

          <div className="space-y-2">
            <Label htmlFor="name">{lead.kind === "b2c" ? "Nome" : "Empresa"}</Label>
            <Input
              id="name"
              value={form.name ?? ""}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={form.phone ?? ""}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                let masked = val;
                if (val.length > 2) masked = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                if (val.length > 7) masked = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                update({ phone: masked });
              }}
              placeholder="(98) 98462-9959"
              inputMode="tel"
            />
          </div>

          {lead.kind === "b2c" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={form.vehicle_model ?? ""}
                  onChange={(e) => update({ vehicle_model: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate">Placa</Label>
                <Input
                  id="plate"
                  value={form.vehicle_plate ?? ""}
                  onChange={(e) =>
                    update({ vehicle_plate: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={form.company_cnpj ?? ""}
                  onChange={(e) => update({ company_cnpj: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fleet">Frota</Label>
                  <Input
                    id="fleet"
                    type="number"
                    min={0}
                    value={form.fleet_size ?? ""}
                    onChange={(e) =>
                      update({
                        fleet_size: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={form.city ?? ""}
                    onChange={(e) => update({ city: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {/* Valor estimado oculto temporariamente */}
        </Card>

        {/* Actions */}
        {/* WhatsApp em destaque */}
        <Button
          type="button"
          disabled={!normalizePhoneBR(lead.phone)}
          onClick={() => {
            const ok = openWhatsApp(lead.phone, {
              leadName: lead.name,
              senderName: profile?.full_name,
              vehicleModel: lead.vehicle_model,
              kind: lead.kind,
            });
            if (!ok) toast.error("Telefone inválido para WhatsApp");
          }}
          className="w-full h-12 bg-[hsl(142_70%_45%)] hover:bg-[hsl(142_70%_40%)] text-white"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Enviar WhatsApp
        </Button>

        <div className="grid grid-cols-2 gap-3">
          {lead.phone ? (
            <Button asChild variant="outline" className="h-12">
              <a href={`tel:${lead.phone}`}>
                <Phone className="w-4 h-4 mr-2" /> Ligar
              </a>
            </Button>
          ) : (
            <Button variant="outline" className="h-12" disabled>
              <Phone className="w-4 h-4 mr-2" /> Sem telefone
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} className="h-12">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Excluir lead
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir este lead?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os dados de <strong>{lead.name}</strong>{" "}
                serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
