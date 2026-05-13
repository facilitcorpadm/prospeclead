import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  LogOut,
  Medal,
  Target,
  Flame,
  Wallet,
  ContactRound,
  TrendingUp,
  Pencil,
} from "lucide-react";
import { formatBRL } from "@/lib/format";

const LEVEL_TARGETS: Record<string, number> = {
  BRONZE: 5000,
  PRATA: 15000,
  OURO: 50000,
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, refetch } = useProfile();
  const [totalLeads, setTotalLeads] = useState(0);
  const [convertedLeads, setConvertedLeads] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(100);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("leads")
      .select("status", { count: "exact" })
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        setTotalLeads(data.length);
        setConvertedLeads(
          data.filter((l) => l.status === "vendido" || l.status === "fechado").length,
        );
      });
  }, [user]);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setGoal(profile.daily_goal ?? 100);
    }
  }, [profile]);

  const displayName = profile?.full_name ?? "Promoter";
  const conversion = totalLeads ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  const earnings = Number(profile?.monthly_earnings ?? 0);
  const level = profile?.level ?? "BRONZE";
  const nextTarget = LEVEL_TARGETS[level] ?? 5000;
  const levelProgress = Math.min(100, Math.round((earnings / nextTarget) * 100));
  const nextLevel =
    level === "BRONZE" ? "PRATA" : level === "PRATA" ? "OURO" : "OURO";

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Nome atualizado");
      setEditOpen(false);
      refetch();
    }
  };

  const handleSaveGoal = async () => {
    if (!user) return;
    if (goal < 1) {
      toast.error("Meta deve ser maior que zero");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ daily_goal: goal })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Meta atualizada");
      setGoalOpen(false);
      refetch();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header card */}
      <Card className="p-6 text-center space-y-3 bg-gradient-prospeclead text-primary-foreground border-0">
        <Avatar className="w-20 h-20 mx-auto ring-4 ring-white/30">
          <AvatarFallback className="bg-white text-primary text-2xl font-bold">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold">{displayName}</h1>
          <p className="text-sm opacity-90">{user?.email}</p>
        </div>
        <Badge className="bg-white/20 text-primary-foreground border-0 gap-1 backdrop-blur-sm">
          <Medal
            className={`w-4 h-4 ${
              level === "OURO"
                ? "text-gold"
                : level === "PRATA"
                  ? "text-silver"
                  : "text-bronze"
            }`}
          />
          Nível {level}
        </Badge>
      </Card>

      {/* Level progress */}
      {level !== "OURO" && (
        <Card className="p-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Próximo nível: {nextLevel}</span>
            <span className="text-muted-foreground text-xs">
              {formatBRL(earnings)} / {formatBRL(nextTarget)}
            </span>
          </div>
          <Progress value={levelProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Faltam <strong>{formatBRL(Math.max(0, nextTarget - earnings))}</strong> em
            ganhos para subir.
          </p>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Wallet}
          label="Ganho do mês"
          value={formatBRL(earnings)}
          tint="text-success"
        />
        <StatCard
          icon={Flame}
          label="Streak"
          value={`${profile?.streak_days ?? 0} dias`}
          tint="text-warning"
        />
        <StatCard
          icon={ContactRound}
          label="Total de leads"
          value={String(totalLeads)}
          tint="text-brand-blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Conversão"
          value={`${conversion}%`}
          tint="text-primary"
        />
      </div>

      {/* Settings */}
      <Card className="p-2">
        <h3 className="font-semibold px-2 pt-2 pb-1 text-sm text-muted-foreground uppercase tracking-wide">
          Configurações
        </h3>

        <Sheet open={editOpen} onOpenChange={setEditOpen}>
          <SheetTrigger asChild>
            <button className="w-full flex items-center gap-3 py-3 px-2 hover:bg-muted rounded-md transition text-left">
              <Pencil className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm">Editar nome</span>
              <span className="text-xs text-muted-foreground truncate max-w-[40%]">
                {displayName}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>Editar nome</SheetTitle>
              <SheetDescription>Como você quer ser chamado no app.</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSaveName}
                disabled={saving}
                className="w-full h-11"
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={goalOpen} onOpenChange={setGoalOpen}>
          <SheetTrigger asChild>
            <button className="w-full flex items-center gap-3 py-3 px-2 hover:bg-muted rounded-md transition text-left">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm">Meta diária</span>
              <span className="text-xs text-muted-foreground">
                {profile?.daily_goal ?? 100} leads
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>Meta diária</SheetTitle>
              <SheetDescription>
                Quantos leads você quer capturar por dia.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="goal">Leads por dia</Label>
                <Input
                  id="goal"
                  type="number"
                  min={1}
                  max={1000}
                  value={goal}
                  onChange={(e) => setGoal(Number(e.target.value) || 0)}
                />
              </div>
              <Button
                onClick={handleSaveGoal}
                disabled={saving}
                className="w-full h-11"
              >
                {saving ? "Salvando..." : "Salvar meta"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </Card>

      <Button variant="outline" className="w-full h-11" onClick={handleSignOut}>
        <LogOut className="w-4 h-4 mr-2" /> Sair da conta
      </Button>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <Card className="p-4 space-y-1">
      <Icon className={`w-5 h-5 ${tint ?? "text-primary"}`} />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </Card>
  );
}
