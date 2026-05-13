import { useState } from "react";
import { Check, Info, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useReadOnly } from "@/hooks/useReadOnly";

interface LeadCommissionDetailsProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function LeadCommissionDetails({ lead, isOpen, onClose, onUpdate }: LeadCommissionDetailsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const readOnly = useReadOnly();

  if (!lead) return null;

  // Calculo das regras de negócio
  const hasBase = true; // Sempre ganha base por existir no sistema
  const baseValue = 0.50;

  // Tem evidência (foto da placa) tirada pela promotora
  const hasPhoto = Boolean(lead.photo_url);
  const photoValue = hasPhoto ? 0.25 : 0;

  // Respondeu WhatsApp
  const hasWhatsappEngagement = Boolean(lead.whatsapp_engaged);
  const whatsappValue = hasWhatsappEngagement ? 0.25 : 0;

  const totalCommission = baseValue + photoValue + whatsappValue;

  const toggleWhatsappEngagement = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ whatsapp_engaged: checked })
        .eq('id', lead.id);

      if (error) throw error;
      
      toast.success(checked ? "Comissão do WhatsApp Aprovada!" : "Comissão do WhatsApp Revogada");
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar status do WhatsApp.");
    } finally {
      setIsUpdating(false);
    }
  };

  const StepRow = ({ title, description, achieved, value, action }: any) => (
    <div className={`flex items-center justify-between p-3 rounded-lg border \${achieved ? 'bg-green-50 border-green-100' : 'bg-muted/50 border-border'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 \${achieved ? 'bg-green-500 text-white' : 'bg-muted-foreground/30 text-white'}`}>
          {achieved ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
        </div>
        <div>
          <p className={`text-sm font-semibold \${achieved ? 'text-green-900' : 'text-muted-foreground'}`}>{title}</p>
          <p className="text-xs text-muted-foreground max-w-[200px] leading-tight mt-0.5">{description}</p>
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
      <div className={`text-sm font-bold \${achieved ? 'text-green-700' : 'text-muted-foreground/50'}`}>
        + R$ {value.toFixed(2).replace('.', ',')}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Extrato de Comissão</DialogTitle>
          <DialogDescription>
            Detalhamento dos ganhos da promotora sobre o lead <strong className="text-foreground">{lead.nome || lead.name || 'Sem nome'}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 my-4">
          <StepRow 
            title="Cadastro Base" 
            description="Lead capturado e salvo no CRM."
            achieved={hasBase} 
            value={baseValue} 
          />
          
          <StepRow 
            title="Foto da Placa" 
            description="A promotora bateu a foto da placa e enviou para o sistema."
            achieved={hasPhoto} 
            value={0.25} 
          />

          <StepRow 
            title="Engajamento no WhatsApp" 
            description="O lead respondeu à primeira mensagem antes da meia-noite."
            achieved={hasWhatsappEngagement} 
            value={0.25} 
            action={
              <div className="flex items-center gap-2 mt-2 bg-white p-2 rounded-md border border-slate-200">
                <Switch 
                  id="whatsapp-toggle" 
                  checked={hasWhatsappEngagement} 
                  onCheckedChange={toggleWhatsappEngagement}
                  disabled={isUpdating || readOnly}
                />
                <Label htmlFor="whatsapp-toggle" className="text-xs cursor-pointer">
                  Aprovar Requisito
                </Label>
              </div>
            }
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-xl shadow-inner mt-2">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-slate-400" />
            <span className="font-medium text-sm">Comissão Total a Pagar</span>
          </div>
          <span className="text-2xl font-bold text-green-400">
            R$ {totalCommission.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
