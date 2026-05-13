import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import logo from "@/assets/prospeclead-logo.png";

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const { data: signed, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    // Verifica papéis e redireciona para o painel correto
    const uid = signed.user?.id;
    if (uid) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      const list = (roles ?? []).map((r) => r.role as string);
      setBusy(false);
      if (list.includes("admin")) {
        navigate("/admin", { replace: true });
        return;
      }
      if (list.includes("rh")) {
        navigate("/rh", { replace: true });
        return;
      }
      if (list.includes("visualizador")) {
        navigate("/admin/visualizador", { replace: true });
        return;
      }
    }
    setBusy(false);
    navigate("/", { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: name },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Conta criada!");
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-prospeclead relative">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-3">
          <img
            src={logo}
            alt="ProspecLead - CRM gamificado para promoters"
            className="mx-auto w-40 h-auto object-contain"
          />
          <p className="text-sm text-muted-foreground">CRM gamificado para promoters</p>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" variant="success" className="w-full" disabled={busy}>
                {busy ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">E-mail</Label>
                <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">Senha</Label>
                <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" variant="success" className="w-full" disabled={busy}>
                {busy ? "Criando..." : "Criar conta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
  <p className="absolute bottom-4 left-0 w-full text-center text-[11px] text-white">Desenvolvido por: <span className="font-semibold text-white">FacilitCorp</span></p>
    </div>
  );
}
