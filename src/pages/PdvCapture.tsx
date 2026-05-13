import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Fuel, Loader2 } from "lucide-react";
import logo from "@/assets/prospeclead-logo.png";

interface PDV {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  active: boolean;
}

export default function PdvCapture() {
  const { code } = useParams<{ code: string }>();
  const [pdv, setPdv] = useState<PDV | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      if (!code) return;
      // Lookup público via SECURITY DEFINER (expõe apenas campos seguros).
      const { data } = await supabase.rpc("get_pdv_public", {
        _short_code: code,
      });
      const row = Array.isArray(data) ? data[0] : data;
      setPdv((row as PDV) ?? null);
      setLoading(false);
    })();
  }, [code]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("capture_pdv_lead", {
      _short_code: code.toUpperCase(),
      _contact_name: name.trim(),
      _contact_phone: phone.trim() || null,
      _note: note.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Cadastro recebido! 🎉");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!pdv) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Fuel className="w-7 h-7 text-destructive" />
          </div>
          <p className="font-semibold">PDV não encontrado</p>
          <p className="text-sm text-muted-foreground">
            O código <strong>{code}</strong> não existe ou está inativo.
          </p>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-prospeclead">
        <Card className="max-w-sm w-full p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9 text-success" />
          </div>
          <div>
            <p className="text-lg font-bold">Tudo certo!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Recebemos seus dados. Em breve um especialista entra em contato com você.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">PDV: {pdv.name}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-prospeclead p-4">
      <div className="max-w-md mx-auto pt-6">
        <img src={logo} alt="ProspecLead" className="mx-auto w-32 h-auto" />
        <Card className="mt-4 p-5 space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-pdv flex items-center justify-center text-primary-foreground mx-auto">
              <Fuel className="w-6 h-6" />
            </div>
            <p className="font-bold mt-2">{pdv.name}</p>
            {(pdv.city || pdv.state) && (
              <p className="text-xs text-muted-foreground">
                {pdv.city}{pdv.state ? ` - ${pdv.state}` : ""}
              </p>
            )}
            <p className="text-sm mt-3">
              Deixe seus dados e receba uma <strong>oferta exclusiva</strong> do nosso parceiro 👇
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Seu nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="(00) 00000-0000" maxLength={20} />
            </div>
            <div>
              <Label>Mensagem (opcional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-12 font-bold bg-success hover:bg-success/90 text-success-foreground">
              {busy ? "Enviando..." : "Quero a oferta!"}
            </Button>
          </form>
        </Card>
        <p className="text-center text-[10px] text-muted-foreground mt-3 opacity-80">
          Powered by ProspecLead
        </p>
      </div>
    </div>
  );
}
