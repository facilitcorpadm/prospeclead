import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  AlertDialogTrigger,
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
  Shield,
  Trash2,
  KeyRound,
  Search,
  Crown,
  User as UserIcon,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";
import { useReadOnly } from "@/hooks/useReadOnly";

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  is_admin: boolean;
  profile: {
    full_name: string | null;
    level: string | null;
    monthly_earnings: number | null;
    daily_goal: number | null;
    streak_days: number | null;
  } | null;
};

export default function AdminPromoters() {
  const { user } = useAuth();
  const readOnly = useReadOnly();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { type: "list" },
    });
    if (error) {
      toast.error(error.message);
    } else {
      setUsers((data as any)?.users ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.email?.toLowerCase().includes(q) ||
      u.profile?.full_name?.toLowerCase().includes(q)
    );
  });

  const toggleAdmin = async (u: AdminUser) => {
    const { error } = await supabase.functions.invoke("admin-users", {
      body: {
        type: "set_role",
        user_id: u.id,
        role: u.is_admin ? "promoter" : "admin",
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(u.is_admin ? "Admin removido" : "Promovido a admin");
    load();
  };

  const toggleVisualizador = async (u: AdminUser) => {
    const isVis = u.roles?.includes("visualizador");
    const { error } = await supabase.functions.invoke("admin-users", {
      body: {
        type: "set_role",
        user_id: u.id,
        role: isVis ? "promoter" : "visualizador",
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isVis ? "Papel visualizador removido" : "Definido como visualizador");
    load();
  };

  const deleteUser = async (u: AdminUser) => {
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { type: "delete", user_id: u.id },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Usuário excluído");
    load();
  };

  return (
    <div className="space-y-5 lg:space-y-6">
      <section className="rounded-lg border bg-card px-4 py-4 shadow-sm md:px-6 md:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Gestão de acessos
            </p>
            <h1 className="text-2xl font-bold md:text-3xl">Promoters & Admins</h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">
              {readOnly
                ? "Consulte os usuários cadastrados na plataforma."
                : "Crie, edite, promova ou exclua usuários do sistema."}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 xl:w-[540px] xl:flex-row xl:items-center xl:justify-end">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {!readOnly && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="xl:min-w-[180px]">
                    <Plus className="w-4 h-4 mr-2" />
                    <span>Novo promoter</span>
                  </Button>
                </DialogTrigger>
                <CreateUserDialog onClose={() => setCreateOpen(false)} onCreated={load} />
              </Dialog>
            )}
          </div>
        </div>
      </section>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {loading && (
          <div className="text-center py-6">
            <Loader2 className="w-5 h-5 animate-spin inline" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center py-6 text-muted-foreground text-sm">Nenhum usuário</p>
        )}
        {filtered.map((u) => (
          <Card key={u.id} className="p-3 space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {u.is_admin ? (
                  <Crown className="w-4 h-4 text-primary" />
                ) : (
                  <UserIcon className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{u.profile?.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {u.is_admin ? (
                    <Badge className="bg-primary text-primary-foreground text-[10px]">ADMIN</Badge>
                  ) : u.roles?.includes("visualizador") ? (
                    <Badge variant="outline" className="text-[10px] border-purple-200 bg-purple-50 text-purple-700">VISUALIZADOR</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">PROMOTER</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    {u.profile?.level ?? "BRONZE"}
                  </Badge>
                </div>
              </div>
              <p className="text-sm font-bold tabular-nums shrink-0">
                {formatBRL(u.profile?.monthly_earnings ?? 0)}
              </p>
            </div>
            {!readOnly && (
              <div className="flex items-center justify-end gap-1 border-t pt-2">
                <EditProfileButton u={u} onSaved={load} />
                <ResetPwButton u={u} />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleAdmin(u)}
                  title={u.is_admin ? "Remover admin" : "Tornar admin"}
                >
                  <Shield className={`w-4 h-4 ${u.is_admin ? "text-primary" : ""}`} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleVisualizador(u)}
                  title={u.roles?.includes("visualizador") ? "Remover visualizador" : "Tornar visualizador"}
                >
                  <Eye className={`w-4 h-4 ${u.roles?.includes("visualizador") ? "text-amber-600" : ""}`} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={u.id === user?.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir {u.email}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação remove o usuário, perfil, leads e carteira de forma permanente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteUser(u)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden lg:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead className="text-right">Ganhos/mês</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Papel</TableHead>
              {!readOnly && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={readOnly ? 5 : 6} className="text-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={readOnly ? 5 : 6} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {u.is_admin ? (
                        <Crown className="w-4 h-4 text-primary" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {u.profile?.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{u.profile?.level ?? "BRONZE"}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(u.profile?.monthly_earnings ?? 0)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.last_sign_in_at
                    ? new Date(u.last_sign_in_at).toLocaleString("pt-BR")
                    : "—"}
                </TableCell>
                <TableCell>
                  {u.is_admin ? (
                    <Badge className="bg-primary text-primary-foreground">ADMIN</Badge>
                  ) : u.roles?.includes("visualizador") ? (
                    <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 font-bold">VISUALIZADOR</Badge>
                  ) : (
                    <Badge variant="secondary">PROMOTER</Badge>
                  )}
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <EditProfileButton u={u} onSaved={load} />
                      <ResetPwButton u={u} />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleAdmin(u)}
                        title={u.is_admin ? "Remover admin" : "Tornar admin"}
                      >
                        <Shield className={`w-4 h-4 ${u.is_admin ? "text-primary" : ""}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleVisualizador(u)}
                        title={u.roles?.includes("visualizador") ? "Remover visualizador" : "Tornar visualizador"}
                      >
                        <Eye className={`w-4 h-4 ${u.roles?.includes("visualizador") ? "text-amber-600" : ""}`} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={u.id === user?.id}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir {u.email}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação remove o usuário, perfil, leads e carteira de forma
                              permanente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser(u)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function CreateUserDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"promoter" | "admin" | "visualizador">("promoter");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      toast.error("Informe e-mail e senha");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha precisa ter no mínimo 6 caracteres");
      return;
    }
    setBusy(true);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { type: "create", email, password, full_name: fullName, role },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Usuário criado!");
    onCreated();
    onClose();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Novo promoter</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Nome completo</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="promoter@empresa.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Senha temporária</Label>
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Papel</Label>
          <Select value={role} onValueChange={(v: any) => setRole(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="promoter">Promoter</SelectItem>
              <SelectItem value="admin">Administrador (Full)</SelectItem>
              <SelectItem value="visualizador">Visualizador (Somente Leitura)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Criar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ResetPwButton({ u }: { u: AdminUser }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (pw.length < 6) {
      toast.error("Mínimo 6 caracteres");
      return;
    }
    setBusy(true);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { type: "update_password", user_id: u.id, password: pw },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha redefinida");
    setPw("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Trocar senha">
          <KeyRound className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Trocar senha de {u.email}</DialogTitle>
        </DialogHeader>
        <Input
          type="text"
          placeholder="Nova senha"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileButton({ u, onSaved }: { u: AdminUser; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(u.profile?.full_name ?? "");
  const [level, setLevel] = useState<string>(u.profile?.level ?? "BRONZE");
  const [goal, setGoal] = useState<string>(String(u.profile?.daily_goal ?? 100));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name,
        level: level as any,
        daily_goal: Number(goal) || 100,
      })
      .eq("id", u.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Perfil atualizado");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Editar perfil">
          <UserIcon className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar {u.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Nível</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRONZE">Bronze</SelectItem>
                  <SelectItem value="PRATA">Prata</SelectItem>
                  <SelectItem value="OURO">Ouro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Meta diária</Label>
              <Input
                inputMode="numeric"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
