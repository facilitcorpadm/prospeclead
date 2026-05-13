import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useWallet, type WalletTx, type Withdrawal } from "@/hooks/useWallet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/format";
import {
  ArrowLeft,
  Wallet,
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Medal,
  Loader2,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Building2,
  Fuel,
} from "lucide-react";
import { toast } from "sonner";

const LEVEL_TARGETS: Record<string, number> = {
  BRONZE: 500,
  PRATA: 2000,
  OURO: 5000,
};

export default function Carteira() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { balance, transactions, withdrawals, loading, refresh } = useWallet();
  const [open, setOpen] = useState(false);

  const level = profile?.level ?? "BRONZE";
  const target = LEVEL_TARGETS[level] ?? 500;
  const monthly = Number(profile?.monthly_earnings ?? 0);
  const progressPct = Math.min(100, Math.round((monthly / target) * 100));

  return (
    <div className="pb-6">
      {/* Header gradient */}
      <div className="bg-gradient-wallet text-primary-foreground px-4 pt-5 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/15">
            <Link to="/"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            <h1 className="font-bold tracking-tight">Carteira Digital</h1>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs uppercase tracking-wider opacity-80">Saldo disponível</p>
          <p className="text-4xl font-extrabold tabular-nums mt-1">
            —
          </p>
          <div className="mt-4 flex justify-center">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 font-bold shadow-lg opacity-70"
              disabled
            >
              <ArrowDownToLine className="w-5 h-5 mr-2" />
              Saque em breve
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Mini-cards: pendente, sacado, total */}
        <div className="grid grid-cols-3 gap-3">
          <MiniCard
            label="Em validação"
            value={balance.pending}
            icon={<Clock className="w-4 h-4 text-warning" />}
            color="text-warning"
          />
          <MiniCard
            label="Já sacado"
            value={balance.withdrawn}
            icon={<CheckCircle2 className="w-4 h-4 text-success" />}
            color="text-success"
          />
          <MiniCard
            label="Total ganho"
            value={balance.total_earned}
            icon={<TrendingUp className="w-4 h-4 text-primary" />}
            color="text-primary"
          />
        </div>

        {/* Nível e meta */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Medal
                className={`w-5 h-5 ${
                  level === "OURO" ? "text-gold" : level === "PRATA" ? "text-silver" : "text-bronze"
                }`}
              />
              <div>
                <p className="text-xs text-muted-foreground">Nível atual</p>
                <p className="font-bold">{level}</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" /> {progressPct}%
            </Badge>
          </div>
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Progresso do mês
          </p>
        </Card>

        {/* Como ganhar */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Como ganhar mais</h3>
          <div className="grid grid-cols-1 gap-2">
            <EarnRow icon={Fuel} title="Foto de placa (B2C)" value="Em breve" />
            <EarnRow icon={Building2} title="Lead B2B fechado" value="Em breve" />
            <EarnRow icon={Plus} title="Reunião agendada" value="Em breve" />
          </div>
        </Card>

        {/* Tabs extrato / saques */}
        <Tabs defaultValue="extrato" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="extrato">Extrato</TabsTrigger>
            <TabsTrigger value="saques">
              Saques {withdrawals.length > 0 && `(${withdrawals.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="extrato" className="space-y-2 mt-3">
            {transactions.length === 0 ? (
              <EmptyState text="Nenhuma transação ainda. Cadastre e converta leads para começar a ganhar." />
            ) : (
              transactions.map((tx) => <TxRow key={tx.id} tx={tx} />)
            )}
          </TabsContent>

          <TabsContent value="saques" className="space-y-2 mt-3">
            {withdrawals.length === 0 ? (
              <EmptyState text="Você ainda não solicitou nenhum saque." />
            ) : (
              withdrawals.map((w) => <WithdrawalRow key={w.id} w={w} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MiniCard({
  label,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={`text-sm font-bold tabular-nums ${color}`}>—</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
    </Card>
  );
}

function EarnRow({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Plus;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-success font-semibold">{value}</p>
      </div>
    </div>
  );
}

function TxRow({ tx }: { tx: WalletTx }) {
  const isCredit = Number(tx.amount) > 0;
  const Icon = isCredit ? Plus : tx.kind === "withdraw_refund" ? RotateCcw : Minus;
  return (
    <Card className="p-3 flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          isCredit ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.description}</p>
        <p className="text-[11px] text-muted-foreground">
          {new Date(tx.created_at).toLocaleString("pt-BR")}
        </p>
      </div>
      <span
        className={`font-bold tabular-nums text-sm ${
          isCredit ? "text-success" : "text-destructive"
        }`}
      >
        —
      </span>
    </Card>
  );
}

function WithdrawalRow({ w }: { w: Withdrawal }) {
  const map: Record<string, { color: string; label: string; icon: typeof Clock }> = {
    pendente: { color: "text-warning bg-warning/10", label: "Pendente", icon: Clock },
    aprovado: { color: "text-primary bg-primary/10", label: "Aprovado", icon: CheckCircle2 },
    pago: { color: "text-success bg-success/10", label: "Pago", icon: CheckCircle2 },
    rejeitado: { color: "text-destructive bg-destructive/10", label: "Rejeitado", icon: XCircle },
    cancelado: { color: "text-muted-foreground bg-muted", label: "Cancelado", icon: XCircle },
  };
  const m = map[w.status] ?? map.pendente;
  const Icon = m.icon;
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${m.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm tabular-nums">—</p>
            <p className="text-[11px] text-muted-foreground truncate">PIX: {w.pix_key}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${m.color}`}>
            {m.label.toUpperCase()}
          </span>
          <p className="text-[10px] text-muted-foreground mt-1">
            {new Date(w.requested_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="p-6 text-center text-sm text-muted-foreground">
      <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
      {text}
    </Card>
  );
}

function WithdrawDialog({
  available,
  onClose,
  onSuccess,
}: {
  available: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [amount, setAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKind, setPixKind] = useState<"cpf" | "cnpj" | "email" | "phone" | "random">("cpf");
  const [holder, setHolder] = useState(profile?.full_name ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    const value = Number(amount.replace(",", "."));
    if (!value || value <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (value > available) {
      toast.error(`Saldo insuficiente. Disponível: ${formatBRL(available)}`);
      return;
    }
    if (value < 10) {
      toast.error("Valor mínimo de saque: R$ 10,00");
      return;
    }
    if (!pixKey.trim()) {
      toast.error("Informe a chave PIX");
      return;
    }
    if (!holder.trim()) {
      toast.error("Informe o nome do titular");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("wallet_withdrawals").insert({
        user_id: user.id,
        amount: value,
        pix_key: pixKey.trim(),
        pix_key_kind: pixKind,
        holder_name: holder.trim(),
      });
      if (error) throw error;
      toast.success("Saque solicitado! Aguarde a confirmação.");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao solicitar saque");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Solicitar saque PIX</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center">
          <p className="text-xs text-muted-foreground">Disponível para saque</p>
          <p className="text-2xl font-extrabold text-primary tabular-nums">{formatBRL(available)}</p>
        </div>

        <div className="space-y-1.5">
          <Label>Valor (R$)</Label>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Mínimo R$ 10,00"
          />
          <div className="flex gap-1.5 text-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAmount(available.toFixed(2))}
            >
              Tudo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAmount("50.00")}
              disabled={available < 50}
            >
              R$ 50
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAmount("100.00")}
              disabled={available < 100}
            >
              R$ 100
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5 col-span-1">
            <Label>Tipo</Label>
            <Select value={pixKind} onValueChange={(v: any) => setPixKind(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Chave PIX</Label>
            <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Sua chave" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Nome do titular</Label>
          <Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Como está no banco" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={busy} className="bg-primary">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
          Confirmar saque
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
