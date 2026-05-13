import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
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
import {
  Calendar,
  Plus,
  MapPin,
  Play,
  Check,
  Trash2,
  Clock,
  Navigation,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Visit = Database["public"]["Tables"]["visits"]["Row"];
type VisitStatus = Database["public"]["Enums"]["visit_status"];

const statusStyles: Record<VisitStatus, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_andamento: "bg-warning/15 text-warning",
  concluida: "bg-success/15 text-success",
};

const statusLabels: Record<VisitStatus, string> = {
  pendente: "pendente",
  em_andamento: "em andamento",
  concluida: "concluída",
};

function localISOForInput(date: Date) {
  const tz = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 16);
}

export default function Agenda() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    place_name: "",
    address: "",
    scheduled_at: localISOForInput(new Date(Date.now() + 60 * 60 * 1000)),
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("visits")
      .select("*")
      .eq("user_id", user.id)
      .gte("scheduled_at", start.toISOString())
      .order("scheduled_at");
    if (error) toast.error(error.message);
    setVisits(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const { todayVisits, upcomingVisits } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const today: Visit[] = [];
    const upcoming: Visit[] = [];
    for (const v of visits) {
      if (new Date(v.scheduled_at) <= end) today.push(v);
      else upcoming.push(v);
    }
    return { todayVisits: today, upcomingVisits: upcoming };
  }, [visits]);

  const done = todayVisits.filter((v) => v.status === "concluida").length;
  const pct = todayVisits.length ? Math.round((done / todayVisits.length) * 100) : 0;
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const handleCreate = async () => {
    if (!user) return;
    if (!form.place_name.trim()) {
      toast.error("Informe o local");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("visits").insert({
      user_id: user.id,
      place_name: form.place_name.trim(),
      address: form.address.trim() || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Visita agendada");
    setOpen(false);
    setForm({
      place_name: "",
      address: "",
      scheduled_at: localISOForInput(new Date(Date.now() + 60 * 60 * 1000)),
    });
    load();
  };

  const updateStatus = async (id: string, status: VisitStatus) => {
    const prev = visits;
    setVisits((vs) => vs.map((v) => (v.id === id ? { ...v, status } : v)));
    const { error } = await supabase.from("visits").update({ status }).eq("id", id);
    if (error) {
      setVisits(prev);
      toast.error(error.message);
    } else {
      toast.success(`Visita: ${statusLabels[status]}`);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("visits").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Visita removida");
      setVisits((vs) => vs.filter((v) => v.id !== id));
    }
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground capitalize truncate">{today}</p>
          <h1 className="text-2xl font-bold">Agenda</h1>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Nova
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>Nova visita</SheetTitle>
              <SheetDescription>Agende uma visita a um cliente ou ponto de prospecção.</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="place">Local *</Label>
                <Input
                  id="place"
                  placeholder="Ex.: Posto Shell Av. Brasil"
                  value={form.place_name}
                  onChange={(e) => setForm({ ...form, place_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr">Endereço</Label>
                <Input
                  id="addr"
                  placeholder="Rua, número, bairro"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="when">Data e hora *</Label>
                <Input
                  id="when"
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full h-11">
                {saving ? "Salvando..." : "Agendar visita"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Progress card */}
      <Card className="p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            {done}/{todayVisits.length} concluídas hoje
          </span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </Card>

      {loading ? (
        <div className="space-y-2">
          <div className="h-20 bg-muted animate-pulse rounded-xl" />
          <div className="h-20 bg-muted animate-pulse rounded-xl" />
        </div>
      ) : todayVisits.length === 0 && upcomingVisits.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">Nenhuma visita agendada</p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Agendar primeira
          </Button>
        </div>
      ) : (
        <>
          {todayVisits.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                Hoje
              </h2>
              {todayVisits.map((v) => (
                <VisitCard
                  key={v.id}
                  visit={v}
                  onStatus={updateStatus}
                  onDelete={handleDelete}
                />
              ))}
            </section>
          )}

          {upcomingVisits.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                Próximas
              </h2>
              {upcomingVisits.map((v) => (
                <VisitCard
                  key={v.id}
                  visit={v}
                  onStatus={updateStatus}
                  onDelete={handleDelete}
                  showDate
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function VisitCard({
  visit,
  onStatus,
  onDelete,
  showDate,
}: {
  visit: Visit;
  onStatus: (id: string, status: VisitStatus) => void;
  onDelete: (id: string) => void;
  showDate?: boolean;
}) {
  const dt = new Date(visit.scheduled_at);
  const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const mapsUrl = visit.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${visit.place_name} ${visit.address}`,
      )}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.place_name)}`;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="text-center w-14 shrink-0 bg-muted rounded-xl py-2">
          <Clock className="w-3 h-3 mx-auto text-muted-foreground mb-0.5" />
          <p className="text-sm font-bold leading-tight">{time}</p>
          {showDate && (
            <p className="text-[10px] text-muted-foreground capitalize">{date}</p>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-semibold truncate">{visit.place_name}</p>
          {visit.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" /> {visit.address}
            </p>
          )}
          <Badge className={`${statusStyles[visit.status]} border-0 capitalize`}>
            {statusLabels[visit.status]}
          </Badge>
        </div>
      </div>

      <div className="flex gap-2">
        {visit.status === "pendente" && (
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => onStatus(visit.id, "em_andamento")}
          >
            <Play className="w-3.5 h-3.5 mr-1" /> Iniciar
          </Button>
        )}
        {visit.status === "em_andamento" && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onStatus(visit.id, "concluida")}
          >
            <Check className="w-3.5 h-3.5 mr-1" /> Concluir
          </Button>
        )}
        {visit.status === "concluida" && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onStatus(visit.id, "pendente")}
          >
            Reabrir
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation className="w-3.5 h-3.5" />
          </a>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover visita?</AlertDialogTitle>
              <AlertDialogDescription>
                A visita a <strong>{visit.place_name}</strong> será excluída.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(visit.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
