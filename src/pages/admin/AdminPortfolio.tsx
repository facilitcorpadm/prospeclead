import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github, FolderOpen } from "lucide-react";

const projetos = [
  {
    nome: "ProspecLead CRM",
    descricao: "Ecossistema omnichannel para geração e gestão de leads com IA integrada. Gamificação de promotores, automação WhatsApp e dashboards de produtividade.",
    tags: ["React", "TypeScript", "Supabase", "IA"],
    link: "https://prospeclead.com.br",
    github: "#",
  },
  {
    nome: "FacilitCorp Dashboard",
    descricao: "Painel administrativo com controle de acesso por perfis (admin, RH, visualizador), Kanban de tarefas e relatórios dinâmicos.",
    tags: ["Next.js", "Tailwind", "PostgreSQL"],
    link: "#",
    github: "#",
  },
  {
    nome: "Bot de Atendimento IA",
    descricao: "Chatbot inteligente para WhatsApp Business, qualificando leads automaticamente e integrando ao funil de vendas via n8n.",
    tags: ["Python", "OpenAI", "n8n", "WhatsApp"],
    link: "#",
    github: "#",
  },
  {
    nome: "Landing Page FacilitCorp",
    descricao: "Site institucional moderno com animações, responsivo e otimizado para SEO, representando a marca FacilitCorp.",
    tags: ["Astro", "Tailwind", "Figma"],
    link: "#",
    github: "#",
  },
  {
    nome: "App de Field Service",
    descricao: "Aplicativo mobile para técnicos de campo com captura de fotos offline, sincronização automática e geração de relatórios.",
    tags: ["React Native", "Offline", "Supabase"],
    link: "#",
    github: "#",
  },
  {
    nome: "Sistema de Comissões",
    descricao: "Módulo de cálculo automático de comissões para promotores, com regras configuráveis e painel de KYC.",
    tags: ["TypeScript", "Node.js", "Prisma"],
    link: "#",
    github: "#",
  },
];

export default function AdminPortfolio() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Portfólio de Projetos</h2>
        <p className="text-muted-foreground mt-1">
          Projetos desenvolvidos pela FacilitCorp utilizando tecnologias modernas e IA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projetos.map((proj, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                {proj.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3">
              <p className="text-sm text-muted-foreground flex-1">
                {proj.descricao}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {proj.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
