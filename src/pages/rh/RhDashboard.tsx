import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  UserCheck,
  Clock,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/format";

type ApprovalStatus = "pendente" | "aprovado" | "rejeitado";
type KycStatus = "nao_enviado" | "em_analise" | "aprovado" | "rejeitado";

type Promoter = {
  id: string;
  full_name: string | null;
  level: string;
  monthly_earnings: number;
  created_at: string;
  approval_status: ApprovalStatus;
  kyc_status: KycStatus;
  active: boolean;
  onboarding_step: number;
  kyc_doc_selfie_url: string | null;
  kyc_doc_id_front_url: string | null;
  kyc_doc_id_back_url: string | null;
  kyc_doc_address_url: string | null;
  kyc_submitted_at: string | null;
  kyc_notes: string | null;
  approval_notes: string | null;
};

type Stats = {
  total: number;
  ativos: number;
  pendentesAprovacao: number;
  kycPendente: number;
};

const APPROVAL_META: Record<ApprovalStatus, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-warning/10 text-warning border-warning/30" },
  aprovado: { label: "Aprovado", cls: "bg-success/10 text-success border-success/30" },
  rejeitado: { label: "Rejeitado", cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

const KYC_META: Record<KycStatus, { label: string; cls: string }> = {
  nao_enviado: { label: "Não enviado", cls: "bg-muted text-muted-foreground border-border" },
  em_analise: { label: "Em análise", cls: "bg-warning/10 text-warning border-warning/30" },
  aprovado: { label: "Aprovado", cls: "bg-success/10 text-success border-success/30" },
  rejeitado: { label: "Rejeitado", cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

const ONBOARDING_STEPS = [
  "Cadastro inicial",
  "Dados pessoais",
  "Documentos KYC",
  "Treinamento",
  "Concluído",
];

export default function RhDashboard() {
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("promoters");

  // KYC review modal
  const [kycOpen, setKycOpen] = useState(false);
  const [kycTarget, setKycTarget] = useState<Promoter | null>(null);
  const [kycNotes, setKycNotes] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Approval modal
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState<Promoter | null>(null);
  const [approvalAction, setApprovalAction] = useState<"aprovado" | "rejeitado">("aprovado");
  const [approvalNotes, setApprovalNotes] = useState("");

  const loadPromoters = async () => {
    setLoading(true);
    // Filtra só promoters reais (papel = promoter)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "promoter");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      setPromoters([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, level, monthly_earnings, created_at, approval_status, kyc_status, active, onboarding_step, kyc_doc_selfie_url, kyc_doc_id_front_url, kyc_doc_id_back_url, kyc_doc_address_url, kyc_submitted_at, kyc_notes, approval_notes",
      )
      .in("id", ids)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    }
    setPromoters((data ?? []) as Promoter[]);
    setLoading(false);
  };

  useEffect(() => {
    loadPromoters();
  }, []);

  const stats: Stats = useMemo(
    () => ({
      total: promoters.length,
      ativos: promoters.filter((p) => p.active && p.approval_status === "aprovado").length,
      pendentesAprovacao: promoters.filter((p) => p.approval_status === "pendente").length,
      kycPendente: promoters.filter((p) => p.kyc_status === "em_analise").length,
    }),
    [promoters],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return promoters;
    return promoters.filter((p) => (p.full_name ?? "").toLowerCase().includes(q));
  }, [promoters, search]);

  const onboardingPending = promoters.filter(
    (p) => p.onboarding_step < ONBOARDING_STEPS.length - 1,
  );
  const kycQueue = promoters.filter((p) => p.kyc_status === "em_analise");

  // ---- KYC review ----
  const openKyc = async (p: Promoter) => {
    setKycTarget(p);
    setKycNotes(p.kyc_notes ?? "");
    setKycOpen(true);
    // gera URLs assinadas para todos os documentos
    const docs = [
      p.kyc_doc_selfie_url,
      p.kyc_doc_id_front_url,
      p.kyc_doc_id_back_url,
      p.kyc_doc_address_url,
    ].filter(Boolean) as string[];
    const urls: Record<string, string> = {};
    for (const path of docs) {
      const { data } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(path, 60 * 30);
      if (data?.signedUrl) urls[path] = data.signedUrl;
    }
    setSignedUrls(urls);
  };

  const decideKyc = async (decision: "aprovado" | "rejeitado") => {
    if (!kycTarget) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        kyc_status: decision,
        kyc_notes: kycNotes.trim() || null,
        kyc_reviewed_at: new Date().toISOString(),
      })
      .eq("id", kycTarget.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: decision === "aprovado" ? "KYC aprovado" : "KYC rejeitado",
      description: kycTarget.full_name ?? "Promoter atualizado",
    });
    setKycOpen(false);
    setKycTarget(null);
    setSignedUrls({});
    loadPromoters();
  };

  // ---- Approval ----
  const openApproval = (p: Promoter, action: "aprovado" | "rejeitado") => {
    setApprovalTarget(p);
    setApprovalAction(action);
    setApprovalNotes(p.approval_notes ?? "");
    setApprovalOpen(true);
  };

  const confirmApproval = async () => {
    if (!approvalTarget) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        approval_status: approvalAction,
        approval_notes: approvalNotes.trim() || null,
        approved_at: new Date().toISOString(),
      })
      .eq("id", approvalTarget.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: approvalAction === "aprovado" ? "Promoter aprovado" : "Promoter rejeitado",
    });
    setApprovalOpen(false);
    setApprovalTarget(null);
    loadPromoters();
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <section className="rounded-lg border bg-card px-4 py-4 shadow-sm md:px-6 md:py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recursos humanos
            </p>
            <h1 className="text-2xl font-bold md:text-3xl">Painel RH</h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">
              Gerencie promoters, aprovações, KYC e contracheques.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-primary" />}
          label="Total de Promoters"
          value={String(stats.total)}
          loading={loading}
        />
        <StatCard
          icon={<UserCheck className="w-5 h-5 text-success" />}
          label="Ativos"
          value={String(stats.ativos)}
          loading={loading}
          accent="success"
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-warning" />}
          label="Pendentes de aprovação"
          value={String(stats.pendentesAprovacao)}
          loading={loading}
          accent="warning"
        />
        <StatCard
          icon={<ShieldCheck className="w-5 h-5 text-warning" />}
          label="KYC pendente"
          value={String(stats.kycPendente)}
          loading={loading}
          accent="warning"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid md:grid-cols-4">
          <TabsTrigger value="promoters">Promoters</TabsTrigger>
          <TabsTrigger value="contracheque">Contracheque</TabsTrigger>
          <TabsTrigger value="onboarding">
            Onboarding
            {onboardingPending.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/20 px-1.5 text-[10px] font-bold text-warning">
                {onboardingPending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="kyc">
            KYC
            {kycQueue.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/20 px-1.5 text-[10px] font-bold text-warning">
                {kycQueue.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Promoters list */}
        <TabsContent value="promoters">
          <Card className="p-4 md:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promoter</TableHead>
                    <TableHead>Aprovação</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ganhos mês</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Carregando…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum promoter encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <PromoterCell p={p} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={APPROVAL_META[p.approval_status].cls}>
                            {APPROVAL_META[p.approval_status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={KYC_META[p.kyc_status].cls}>
                            {KYC_META[p.kyc_status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              p.active
                                ? "bg-success/10 text-success border-success/30"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {p.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBRL(p.monthly_earnings)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {p.approval_status === "pendente" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-success border-success/30 hover:bg-success/10"
                                  onClick={() => openApproval(p, "aprovado")}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => openApproval(p, "rejeitado")}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {p.kyc_status === "em_analise" && (
                              <Button size="sm" variant="outline" onClick={() => openKyc(p)}>
                                <Eye className="w-4 h-4 mr-1" /> KYC
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Contracheque */}
        <TabsContent value="contracheque">
          <PayslipsPanel promoters={promoters} loading={loading} />
        </TabsContent>

        {/* Onboarding */}
        <TabsContent value="onboarding">
          <Card className="p-4 md:p-5">
            <h3 className="font-semibold mb-3">Onboarding pendente</h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promoter</TableHead>
                    <TableHead>Etapa atual</TableHead>
                    <TableHead className="w-[40%]">Progresso</TableHead>
                    <TableHead>Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onboardingPending.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum promoter com onboarding pendente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    onboardingPending.map((p) => {
                      const pct = Math.round(
                        (p.onboarding_step / (ONBOARDING_STEPS.length - 1)) * 100,
                      );
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <PromoterCell p={p} />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {ONBOARDING_STEPS[p.onboarding_step] ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                                {pct}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* KYC */}
        <TabsContent value="kyc">
          <Card className="p-4 md:p-5">
            <h3 className="font-semibold mb-3">Documentos para revisar</h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promoter</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Documentos</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kycQueue.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum KYC aguardando revisão.
                      </TableCell>
                    </TableRow>
                  ) : (
                    kycQueue.map((p) => {
                      const docs = [
                        p.kyc_doc_selfie_url,
                        p.kyc_doc_id_front_url,
                        p.kyc_doc_id_back_url,
                        p.kyc_doc_address_url,
                      ].filter(Boolean).length;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <PromoterCell p={p} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.kyc_submitted_at
                              ? new Date(p.kyc_submitted_at).toLocaleString("pt-BR")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <FileText className="w-3 h-3 mr-1" />
                              {docs} / 4
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => openKyc(p)}>
                              <Eye className="w-4 h-4 mr-1" /> Revisar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* KYC Review Modal */}
      <Dialog open={kycOpen} onOpenChange={setKycOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisão KYC — {kycTarget?.full_name}</DialogTitle>
            <DialogDescription>
              Confira os documentos enviados e aprove ou rejeite.
            </DialogDescription>
          </DialogHeader>
          {kycTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DocCard
                  label="Selfie"
                  path={kycTarget.kyc_doc_selfie_url}
                  url={signedUrls[kycTarget.kyc_doc_selfie_url ?? ""]}
                />
                <DocCard
                  label="Documento (frente)"
                  path={kycTarget.kyc_doc_id_front_url}
                  url={signedUrls[kycTarget.kyc_doc_id_front_url ?? ""]}
                />
                <DocCard
                  label="Documento (verso)"
                  path={kycTarget.kyc_doc_id_back_url}
                  url={signedUrls[kycTarget.kyc_doc_id_back_url ?? ""]}
                />
                <DocCard
                  label="Comprovante de endereço"
                  path={kycTarget.kyc_doc_address_url}
                  url={signedUrls[kycTarget.kyc_doc_address_url ?? ""]}
                />
              </div>
              <div>
                <Label htmlFor="kyc-notes">Notas do RH</Label>
                <Textarea
                  id="kyc-notes"
                  value={kycNotes}
                  onChange={(e) => setKycNotes(e.target.value)}
                  placeholder="Observações sobre os documentos..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setKycOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => decideKyc("rejeitado")}
            >
              <XCircle className="w-4 h-4 mr-1" /> Rejeitar
            </Button>
            <Button
              className="bg-success text-success-foreground hover:bg-success/90"
              onClick={() => decideKyc("aprovado")}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Modal */}
      <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "aprovado" ? "Aprovar promoter" : "Rejeitar promoter"}
            </DialogTitle>
            <DialogDescription>
              {approvalTarget?.full_name} — confirme a decisão.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="approval-notes">Justificativa (opcional)</Label>
            <Textarea
              id="approval-notes"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className={
                approvalAction === "aprovado"
                  ? "bg-success text-success-foreground hover:bg-success/90"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
              onClick={confirmApproval}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
  accent?: "warning" | "success";
}) {
  const accentCls =
    accent === "warning"
      ? "bg-warning/5 border-warning/30"
      : accent === "success"
        ? "bg-success/5 border-success/30"
        : "";
  return (
    <Card className={`p-4 md:p-5 ${accentCls}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums md:text-3xl">
        {loading ? "…" : value}
      </p>
    </Card>
  );
}

function PromoterCell({ p }: { p: Promoter }) {
  const initials = (p.full_name ?? "P")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{p.full_name ?? "Sem nome"}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{p.level}</p>
      </div>
    </div>
  );
}

function DocCard({
  label,
  path,
  url,
}: {
  label: string;
  path: string | null;
  url: string | undefined;
}) {
  if (!path) {
    return (
      <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
        <p className="font-medium mb-1">{label}</p>
        Não enviado
      </div>
    );
  }
  return (
    <div className="rounded-md border overflow-hidden bg-muted/30">
      <div className="px-3 py-2 border-b bg-background flex items-center justify-between">
        <p className="text-xs font-semibold">{label}</p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            Abrir <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <div className="aspect-[4/3] flex items-center justify-center">
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-contain" />
        ) : (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        )}
      </div>
    </div>
  );
}

// ---------------- Payslips ----------------

type Payslip = {
  id: string;
  user_id: string;
  reference_month: string;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  status: "rascunho" | "emitido" | "pago";
  notes: string | null;
};

const PAYSLIP_META = {
  rascunho: { label: "Rascunho", cls: "bg-muted text-muted-foreground border-border" },
  emitido: { label: "Emitido", cls: "bg-primary/10 text-primary border-primary/30" },
  pago: { label: "Pago", cls: "bg-success/10 text-success border-success/30" },
};

function PayslipsPanel({
  promoters,
  loading,
}: {
  promoters: Promoter[];
  loading: boolean;
}) {
  const [list, setList] = useState<Payslip[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    user_id: "",
    reference_month: new Date().toISOString().slice(0, 7), // YYYY-MM
    gross_amount: "",
    deductions: "0",
    notes: "",
  });

  const load = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("payslips")
      .select("id, user_id, reference_month, gross_amount, deductions, net_amount, status, notes")
      .order("reference_month", { ascending: false });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setList((data ?? []) as Payslip[]);
    setLoadingList(false);
  };

  useEffect(() => {
    load();
  }, []);

  const promoterMap = useMemo(() => {
    const m = new Map<string, string>();
    promoters.forEach((p) => m.set(p.id, p.full_name ?? "Sem nome"));
    return m;
  }, [promoters]);

  const handleCreate = async () => {
    const gross = Number(form.gross_amount || 0);
    const ded = Number(form.deductions || 0);
    if (!form.user_id) {
      toast({ title: "Selecione um promoter", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("payslips").insert({
      user_id: form.user_id,
      reference_month: `${form.reference_month}-01`,
      gross_amount: gross,
      deductions: ded,
      net_amount: gross - ded,
      status: "emitido",
      notes: form.notes || null,
      issued_at: new Date().toISOString(),
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Contracheque emitido" });
    setOpen(false);
    setForm({
      user_id: "",
      reference_month: new Date().toISOString().slice(0, 7),
      gross_amount: "",
      deductions: "0",
      notes: "",
    });
    load();
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase
      .from("payslips")
      .update({ status: "pago", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Marcado como pago" });
    load();
  };

  return (
    <Card className="p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Contracheques</h3>
        <Button size="sm" onClick={() => setOpen(true)} disabled={loading}>
          Novo contracheque
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Promoter</TableHead>
              <TableHead>Mês ref.</TableHead>
              <TableHead className="text-right">Bruto</TableHead>
              <TableHead className="text-right">Descontos</TableHead>
              <TableHead className="text-right">Líquido</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingList ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum contracheque emitido ainda.
                </TableCell>
              </TableRow>
            ) : (
              list.map((p) => {
                const meta = PAYSLIP_META[p.status];
                const month = new Date(p.reference_month).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                });
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">
                      {promoterMap.get(p.user_id) ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{month}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(p.gross_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(p.deductions)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatBRL(p.net_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={meta.cls}>
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status !== "pago" && (
                        <Button size="sm" variant="outline" onClick={() => markPaid(p.id)}>
                          Marcar pago
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo contracheque</DialogTitle>
            <DialogDescription>Emitir contracheque para um promoter.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Promoter</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              >
                <option value="">Selecione…</option>
                {promoters.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? "Sem nome"}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mês de referência</Label>
                <Input
                  type="month"
                  value={form.reference_month}
                  onChange={(e) => setForm({ ...form, reference_month: e.target.value })}
                />
              </div>
              <div>
                <Label>Valor bruto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.gross_amount}
                  onChange={(e) => setForm({ ...form, gross_amount: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Descontos (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.deductions}
                onChange={(e) => setForm({ ...form, deductions: e.target.value })}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Emitir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
