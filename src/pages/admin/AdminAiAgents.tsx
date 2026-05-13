import { useState } from "react";
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";

/* ─── Tipos ─────────────────────────────────────────── */
type TomDeVoz = "Formal" | "Normal" | "Descontraído";
type ModeloLLM =
  | "GPT-4o"
  | "GPT-4o Mini"
  | "Claude 3.5 Sonnet"
  | "Claude 3 Haiku"
  | "Gemini 1.5 Pro"
  | "Gemini 1.5 Flash"
  | "Llama 3.1 70B";

interface AiAgent {
  id: string;
  nome: string;
  modelo: ModeloLLM;
  tom: TomDeVoz;
  promptSistema: string;
  criadoEm: string;
}

/* ─── Dados iniciais de exemplo ─────────────────────── */
const EXEMPLO_AGENTES: AiAgent[] = [
  {
    id: "1",
    nome: "Qualificador de Leads",
    modelo: "GPT-4o",
    tom: "Formal",
    promptSistema:
      "Você é um assistente especializado em qualificação de leads para seguros. Seu objetivo é identificar o perfil do cliente, suas dores e necessidades, e classificar o potencial de conversão.",
    criadoEm: "2026-04-10",
  },
  {
    id: "2",
    nome: "Atendente ProspecLead",
    modelo: "Claude 3.5 Sonnet",
    tom: "Normal",
    promptSistema:
      "Você é o assistente virtual da ProspecLead. Responda dúvidas sobre planos, cobertura e documentação necessária de forma clara e objetiva.",
    criadoEm: "2026-04-22",
  },
];

/* ─── Configuração de modelos ────────────────────────── */
const MODELOS: { value: ModeloLLM; label: string; badge: string }[] = [
  { value: "GPT-4o", label: "GPT-4o", badge: "OpenAI" },
  { value: "GPT-4o Mini", label: "GPT-4o Mini", badge: "OpenAI" },
  { value: "Claude 3.5 Sonnet", label: "Claude 3.5 Sonnet", badge: "Anthropic" },
  { value: "Claude 3 Haiku", label: "Claude 3 Haiku", badge: "Anthropic" },
  { value: "Gemini 1.5 Pro", label: "Gemini 1.5 Pro", badge: "Google" },
  { value: "Gemini 1.5 Flash", label: "Gemini 1.5 Flash", badge: "Google" },
  { value: "Llama 3.1 70B", label: "Llama 3.1 70B", badge: "Meta" },
];

const TOM_OPTIONS: { value: TomDeVoz; label: string; desc: string; color: string }[] = [
  { value: "Formal", label: "Formal", desc: "Linguagem profissional e técnica", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { value: "Normal", label: "Normal", desc: "Tom equilibrado e amigável", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { value: "Descontraído", label: "Descontraído", desc: "Linguagem leve e próxima", color: "bg-violet-500/10 text-violet-600 border-violet-200" },
];

function tomBadgeClass(tom: TomDeVoz) {
  const map: Record<TomDeVoz, string> = {
    Formal: "bg-blue-500/10 text-blue-600 border-blue-200",
    Normal: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    Descontraído: "bg-violet-500/10 text-violet-600 border-violet-200",
  };
  return map[tom];
}

function modeloBadgeClass(modelo: ModeloLLM) {
  if (modelo.startsWith("GPT")) return "bg-green-500/10 text-green-700 border-green-200";
  if (modelo.startsWith("Claude")) return "bg-orange-500/10 text-orange-700 border-orange-200";
  if (modelo.startsWith("Gemini")) return "bg-blue-500/10 text-blue-700 border-blue-200";
  return "bg-gray-500/10 text-gray-700 border-gray-200";
}

/* ─── Formulário em branco ───────────────────────────── */
const FORM_VAZIO = {
  nome: "",
  modelo: "" as ModeloLLM | "",
  tom: "" as TomDeVoz | "",
  promptSistema: "",
};

/* ═══════════════════════════════════════════════════════
   Componente Principal
═══════════════════════════════════════════════════════ */
export default function AdminAiAgents() {
  const { toast } = useToast();
  const [agentes, setAgentes] = useState<AiAgent[]>(EXEMPLO_AGENTES);

  // Modal criar/editar
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);

  // Confirmação de exclusão
  const [excluirId, setExcluirId] = useState<string | null>(null);

  /* ── Helpers ── */
  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(agente: AiAgent) {
    setEditandoId(agente.id);
    setForm({
      nome: agente.nome,
      modelo: agente.modelo,
      tom: agente.tom,
      promptSistema: agente.promptSistema,
    });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setForm(FORM_VAZIO);
    setEditandoId(null);
  }

  function salvar() {
    if (!form.nome.trim() || !form.modelo || !form.tom || !form.promptSistema.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    if (editandoId) {
      setAgentes((prev) =>
        prev.map((a) =>
          a.id === editandoId
            ? { ...a, nome: form.nome, modelo: form.modelo as ModeloLLM, tom: form.tom as TomDeVoz, promptSistema: form.promptSistema }
            : a
        )
      );
      toast({ title: "Agente atualizado", description: `"${form.nome}" foi salvo com sucesso.` });
    } else {
      const novoAgente: AiAgent = {
        id: Date.now().toString(),
        nome: form.nome,
        modelo: form.modelo as ModeloLLM,
        tom: form.tom as TomDeVoz,
        promptSistema: form.promptSistema,
        criadoEm: new Date().toISOString().slice(0, 10),
      };
      setAgentes((prev) => [novoAgente, ...prev]);
      toast({ title: "Agente criado!", description: `"${form.nome}" foi adicionado com sucesso.` });
    }

    fecharModal();
  }

  function confirmarExclusao() {
    if (!excluirId) return;
    const agente = agentes.find((a) => a.id === excluirId);
    setAgentes((prev) => prev.filter((a) => a.id !== excluirId));
    setExcluirId(null);
    toast({ title: "Agente removido", description: `"${agente?.nome}" foi excluído.` });
  }

  /* ── UI ── */
  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agentes de IA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure e gerencie agentes inteligentes para qualificação e atendimento.
          </p>
        </div>
        <Button id="btn-novo-agente" onClick={abrirNovo} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Novo Agente
        </Button>
      </div>

      {/* Grid de agentes */}
      {agentes.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center gap-4 border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Bot className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Nenhum agente configurado</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em <strong>+ Novo Agente</strong> para criar o primeiro.
            </p>
          </div>
          <Button onClick={abrirNovo} variant="outline" className="gap-2 mt-2">
            <Plus className="w-4 h-4" />
            Criar Agente
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agentes.map((agente) => (
            <Card
              key={agente.id}
              className="p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
            >
              {/* Topo do card */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{agente.nome}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Criado em {new Date(agente.criadoEm).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    id={`btn-editar-${agente.id}`}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => abrirEdicao(agente)}
                    aria-label="Editar agente"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    id={`btn-excluir-${agente.id}`}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setExcluirId(agente.id)}
                    aria-label="Excluir agente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold px-2 h-5 ${modeloBadgeClass(agente.modelo)}`}
                >
                  {agente.modelo}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold px-2 h-5 ${tomBadgeClass(agente.tom)}`}
                >
                  {agente.tom}
                </Badge>
              </div>

              {/* Prompt preview */}
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Prompt do Sistema
                </p>
                <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
                  {agente.promptSistema}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Modal Criar / Editar ─────────────────────────────── */}
      <Dialog open={modalAberto} onOpenChange={(open) => !open && fecharModal()}>
        <DialogContent className="max-w-xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              {editandoId ? "Editar Agente" : "Novo Agente de IA"}
            </DialogTitle>
            <DialogDescription>
              {editandoId
                ? "Atualize as configurações do agente."
                : "Configure um novo agente inteligente para seu pipeline de atendimento."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Nome do Agente */}
            <div className="space-y-1.5">
              <Label htmlFor="agent-nome" className="text-sm font-medium">
                Nome do Agente <span className="text-destructive">*</span>
              </Label>
              <Input
                id="agent-nome"
                placeholder="Ex.: Qualificador de Leads"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>

            {/* Modelo LLM */}
            <div className="space-y-1.5">
              <Label htmlFor="agent-modelo" className="text-sm font-medium">
                Modelo LLM <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.modelo}
                onValueChange={(v) => setForm((f) => ({ ...f, modelo: v as ModeloLLM }))}
              >
                <SelectTrigger id="agent-modelo" className="w-full">
                  <SelectValue placeholder="Selecione o modelo de IA..." />
                </SelectTrigger>
                <SelectContent>
                  {MODELOS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2">
                        <span>{m.label}</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-1">
                          {m.badge}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tom de Voz */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Tom de Voz <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {TOM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    id={`tom-${opt.value.toLowerCase()}`}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tom: opt.value }))}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      form.tom === opt.value
                        ? `${opt.color} border-current shadow-sm`
                        : "border-border bg-background hover:bg-muted text-foreground/70"
                    }`}
                  >
                    <p className="text-sm font-semibold leading-tight">{opt.label}</p>
                    <p className="text-[10px] mt-0.5 opacity-75 leading-tight">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt de Sistema */}
            <div className="space-y-1.5">
              <Label htmlFor="agent-prompt" className="text-sm font-medium">
                Prompt de Sistema <span className="text-destructive">*</span>
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Descreva como a IA deve se comportar, seu papel e as instruções que deve seguir.
              </p>
              <Textarea
                id="agent-prompt"
                placeholder="Ex.: Você é um assistente especializado em qualificação de leads para seguros. Seu objetivo é..."
                className="min-h-[160px] resize-y font-mono text-xs leading-relaxed"
                value={form.promptSistema}
                onChange={(e) => setForm((f) => ({ ...f, promptSistema: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {form.promptSistema.length} caracteres
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={fecharModal} className="gap-1.5">
              <X className="w-3.5 h-3.5" />
              Cancelar
            </Button>
            <Button id="btn-salvar-agente" onClick={salvar} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {editandoId ? "Salvar Alterações" : "Criar Agente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Confirmação de exclusão ──────────────────────────── */}
      <AlertDialog open={!!excluirId} onOpenChange={(open) => !open && setExcluirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não poderá ser desfeita. O agente{" "}
              <strong>{agentes.find((a) => a.id === excluirId)?.nome}</strong> será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
