import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useReadOnly } from "@/hooks/useReadOnly";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Plus,
  Search,
  Pencil,
  KeyRound,
  Ban,
  CheckCircle2,
  Trash2,
  Users as UsersIcon,
  ShieldCheck,
  Crown,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

type RoleKey = "admin" | "rh" | "promoter" | "visualizador";

type AdminUser = {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  roles: string[];
  is_admin: boolean;
  is_rh: boolean;
  profile: {
    full_name: string | null;
    current_location: string | null;
    level: string | null;
  } | null;
};

const ROLE_META: Record<RoleKey, { label: string; cls: string }> = {
  admin: {
    label: "Admin Master",
    cls: "bg-amber-100 text-amber-800 border-amber-200",
  },
  rh: {
    label: "Gestor (RH)",
    cls: "bg-violet-100 text-violet-800 border-violet-200",
  },
  promoter: {
    label: "Promotor",
    cls: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  visualizador: {
    label: "ADM Visualizador",
    cls: "bg-amber-50 text-amber-600 border-amber-200 font-bold",
  },
};

function getInitials(name?: string | null, email?: string | null) {
  const src = (name || email || "U").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function userRole(u: AdminUser): RoleKey {
  if (u.is_admin) return "admin";
  if (u.is_rh) return "rh";
  if (u.roles?.includes("visualizador")) return "visualizador";
  return "promoter";
}

function isBanned(u: AdminUser) {
  if (!u.banned_until) return false;
  return new Date(u.banned_until).getTime() > Date.now();
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  role: RoleKey;
  tenant: string;
  password: string;
};

const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  phone: "",
  role: "promoter",
  tenant: "",
  password: "",
};

export default function AdminUsuarios() {
  const { user: meUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const readOnly = useReadOnly();
  const [busy, setBusy] = useState(false);

  // filtros
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | RoleKey>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ativo" | "bloqueado">("all");

  // modais
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "ban" | "unban";
    user: AdminUser;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { type: "list" },
    });
    if (error) {
      toast.error("Erro ao carregar usuários", { description: error.message });
      setLoading(false);
      return;
    }
    setUsers((data?.users ?? []) as AdminUser[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const ativos = users.filter((u) => !isBanned(u)).length;
    const admins = users.filter((u) => u.is_admin).length;
    const gestores = users.filter((u) => u.is_rh && !u.is_admin).length;
    return { total, ativos, admins, gestores };
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const role = userRole(u);
      const banned = isBanned(u);
      if (roleFilter !== "all" && role !== roleFilter) return false;
      if (statusFilter === "ativo" && banned) return false;
      if (statusFilter === "bloqueado" && !banned) return false;
      if (!q) return true;
      const name = u.profile?.full_name ?? "";
      const tenant = u.profile?.current_location ?? "";
      return (
        name.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q) ||
        tenant.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  /* ----------------- Ações ----------------- */
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreateOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({
      full_name: u.profile?.full_name ?? "",
      email: u.email ?? "",
      phone: u.phone ?? "",
      role: userRole(u),
      tenant: u.profile?.current_location ?? "",
      password: "",
    });
    setEditOpen(true);
  };

  const submitCreate = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      toast.error("E-mail e senha são obrigatórios");
      return;
    }
    if (form.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setBusy(true);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: {
        type: "create",
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        tenant: form.tenant.trim(),
        role: form.role,
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Falha ao criar usuário", { description: error.message });
      return;
    }
    toast.success("Usuário criado com sucesso");
    setCreateOpen(false);
    load();
  };

  const submitEdit = async () => {
    if (!editing) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: {
        type: "update",
        user_id: editing.id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        tenant: form.tenant.trim(),
        role: form.role,
      },
    });
    if (!error && form.password.trim()) {
      if (form.password.length < 6) {
        setBusy(false);
        toast.error("Senha deve ter ao menos 6 caracteres");
        return;
      }
      const { error: pwErr } = await supabase.functions.invoke("admin-users", {
        body: {
          type: "update_password",
          user_id: editing.id,
          password: form.password,
        },
      });
      if (pwErr) {
        setBusy(false);
        toast.error("Dados salvos, mas senha falhou", {
          description: pwErr.message,
        });
        return;
      }
    }
    setBusy(false);
    if (error) {
      toast.error("Falha ao atualizar", { description: error.message });
      return;
    }
    toast.success("Usuário atualizado");
    setEditOpen(false);
    setEditing(null);
    load();
  };

  const runConfirm = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    setBusy(true);
    if (type === "delete") {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { type: "delete", user_id: user.id },
      });
      setBusy(false);
      if (error) {
        toast.error("Falha ao excluir", { description: error.message });
        return;
      }
      toast.success("Usuário excluído");
    } else {
      const banned = type === "ban";
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { type: "update", user_id: user.id, banned },
      });
      setBusy(false);
      if (error) {
        toast.error("Falha ao alterar status", { description: error.message });
        return;
      }
      toast.success(banned ? "Usuário bloqueado" : "Usuário desbloqueado");
    }
    setConfirmAction(null);
    load();
  };

  /* ----------------- Render ----------------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold leading-tight">
            Gestão de Usuários
          </h2>
          <p className="text-sm text-muted-foreground">
            Contas, papéis e acessos da plataforma.
          </p>
        </div>
        {!readOnly && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Usuário
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<UsersIcon className="w-4 h-4" />}
          label="Total"
          value={stats.total}
          tone="slate"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Ativos"
          value={stats.ativos}
          tone="emerald"
        />
        <StatCard
          icon={<Crown className="w-4 h-4" />}
          label="Admin Masters"
          value={stats.admins}
          tone="amber"
        />
        <StatCard
          icon={<ShieldCheck className="w-4 h-4" />}
          label="Gestores"
          value={stats.gestores}
          tone="violet"
        />
      </div>

      {/* Filtros */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail, telefone ou tenant…"
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
            <SelectTrigger className="md:w-[180px]">
              <SelectValue placeholder="Todos os papéis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os papéis</SelectItem>
              <SelectItem value="admin">Admin Master</SelectItem>
              <SelectItem value="rh">Gestor (RH)</SelectItem>
              <SelectItem value="visualizador">ADM Visualizador</SelectItem>
              <SelectItem value="promoter">Promotor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="md:w-[160px]">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="bloqueado">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Usuário</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="hidden md:table-cell">Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Cadastro
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const role = userRole(u);
                  const meta = ROLE_META[role];
                  const banned = isBanned(u);
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {getInitials(u.profile?.full_name, u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {u.profile?.full_name || "Sem nome"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </p>
                            {u.phone && (
                              <p className="text-[11px] text-muted-foreground">
                                {u.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${meta.cls} font-semibold`}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {u.profile?.current_location || "—"}
                      </TableCell>
                      <TableCell>
                        {banned ? (
                          <Badge
                            variant="outline"
                            className="bg-rose-100 text-rose-700 border-rose-200"
                          >
                            Bloqueado
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-100 text-emerald-700 border-emerald-200"
                          >
                            Ativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {fmtDate(u.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {!readOnly && (
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Editar"
                              onClick={() => openEdit(u)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title={banned ? "Desbloquear" : "Bloquear"}
                              onClick={() =>
                                setConfirmAction({
                                  type: banned ? "unban" : "ban",
                                  user: u,
                                })
                              }
                            >
                              {banned ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Ban className="w-4 h-4 text-amber-600" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Excluir"
                              disabled={u.id === meUser?.id}
                              onClick={() =>
                                setConfirmAction({ type: "delete", user: u })
                              }
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Modal Criar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              O usuário receberá acesso imediato com o papel selecionado.
            </DialogDescription>
          </DialogHeader>
          <UserForm form={form} setForm={setForm} mode="create" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitCreate} disabled={busy} className="gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>
              {editing?.email ?? ""} — atualize dados, papel ou senha.
            </DialogDescription>
          </DialogHeader>
          <UserForm form={form} setForm={setForm} mode="edit" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitEdit} disabled={busy} className="gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação destrutiva */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(o) => !o && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "delete" && "Excluir usuário?"}
              {confirmAction?.type === "ban" && "Bloquear usuário?"}
              {confirmAction?.type === "unban" && "Desbloquear usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "delete"
                ? `Esta ação é permanente. ${confirmAction?.user.email} perderá acesso imediato.`
                : confirmAction?.type === "ban"
                  ? `${confirmAction?.user.email} não poderá mais entrar até ser desbloqueado.`
                  : `${confirmAction?.user.email} voltará a ter acesso normal.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirm}
              disabled={busy}
              className={
                confirmAction?.type === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Subcomponentes ---------------- */

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "slate" | "emerald" | "amber" | "violet";
}) {
  const toneCls = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
  }[tone];
  return (
    <Card className="p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneCls}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
      </div>
    </Card>
  );
}

function UserForm({
  form,
  setForm,
  mode,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  mode: "create" | "edit";
}) {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm({ ...form, [k]: v });
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="u-name">Nome completo</Label>
        <Input
          id="u-name"
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          placeholder="Maria Silva"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="u-email">E-mail</Label>
          <Input
            id="u-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="usuario@empresa.com"
            disabled={mode === "edit"}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="u-phone">Telefone</Label>
          <Input
            id="u-phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Papel</Label>
          <Select value={form.role} onValueChange={(v) => set("role", v as RoleKey)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin Master</SelectItem>
              <SelectItem value="rh">Gestor (RH)</SelectItem>
              <SelectItem value="visualizador">ADM Visualizador (Leitura)</SelectItem>
              <SelectItem value="promoter">Promotor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="u-tenant">Tenant / Unidade</Label>
          <Input
            id="u-tenant"
            value={form.tenant}
            onChange={(e) => set("tenant", e.target.value)}
            placeholder="Ex.: São Paulo · Matriz"
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="u-pass" className="flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5" />
          {mode === "create" ? "Senha inicial" : "Nova senha (opcional)"}
        </Label>
        <Input
          id="u-pass"
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder={mode === "create" ? "Mín. 6 caracteres" : "Deixe em branco para manter"}
        />
      </div>
    </div>
  );
}
