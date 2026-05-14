// Version: 1.0.9 - Disabled Automatic Forced Updates
// Test update for Lovable sync
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProspectingTimerProvider } from "@/hooks/useProspectingTimer";
import { SyncProvider } from "@/hooks/useSync";
import OfflineStatus from "@/components/OfflineStatus";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import LeadsList from "./pages/LeadsList";
import LeadNew from "./pages/LeadNew";
import LeadDetail from "./pages/LeadDetail";
import Frentista from "./pages/Frentista";
import ProspeccaoB2B from "./pages/ProspeccaoB2B";
import Carteira from "./pages/Carteira";
import CheckIn from "./pages/CheckIn";
import Agenda from "./pages/Agenda";
import Profile from "./pages/Profile";
import Missoes from "./pages/Missoes";
import NotFound from "./pages/NotFound";
import Rede from "./pages/Rede";
import Equipe from "./pages/Equipe";
import RedeNovo from "./pages/RedeNovo";
import CadastroParceiroFinal from "./pages/CadastroParceiroFinal";
import CadastroPDVCompleto from "./pages/CadastroPDVCompleto";
import PdvCapture from "./pages/PdvCapture";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPromoters from "./pages/admin/AdminPromoters";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminSaques from "./pages/admin/AdminSaques";
import AdminRanking from "./pages/admin/AdminRanking";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder";
import AdminAiAgents from "./pages/admin/AdminAiAgents";
import AdminCampaigns from "./pages/admin/AdminCampaigns";
import AdminRadarB2B from "./pages/admin/AdminRadarB2B";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminAuditoriaFotos from "./pages/admin/AdminAuditoriaFotos";
import AdminComissoesKyc from "./pages/admin/AdminComissoesKyc";
import AdminProdutos from "./pages/admin/AdminProdutos";
import ProspectLeadEcosystem from "./pages/admin/ProspectLeadEcosystem";
import FilaOportunidadesFinal from "./pages/admin/FilaOportunidadesFinal";
import AdminRevisaoKyc from "./pages/admin/AdminRevisaoKyc";
import PDV from "./pages/PDV";
import RhLayout from "./components/RhLayout";
import RhDashboard from "./pages/rh/RhDashboard";
import RhPromoters from "./pages/rh/RhPromoters";
import RhPagamentos from "./pages/rh/RhPagamentos";
import VisualizadorLayout from "./components/VisualizadorLayout";
import AdminVisualizador from "./pages/admin/AdminVisualizador";
import AdminTarefas from "./pages/admin/AdminTarefas";
import AdminKanban from "./pages/admin/AdminKanban";
import AdminMarcas from "./pages/admin/AdminMarcas";
import AdminInbox from "./pages/admin/AdminInbox";
import AdminPortfolio from "./pages/admin/AdminPortfolio";
import WhatsAppConfig from "./pages/admin/WhatsAppConfig";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SyncProvider>
            <ProspectingTimerProvider>
              <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
              <Route path="/leads" element={<AppLayout><LeadsList /></AppLayout>} />
              <Route path="/leads/novo" element={<AppLayout wide><LeadNew /></AppLayout>} />
              <Route path="/leads/:id" element={<AppLayout><LeadDetail /></AppLayout>} />
              <Route path="/frentista" element={<Frentista />} />
              <Route path="/prospeccao-b2b" element={<AppLayout wide><ProspeccaoB2B /></AppLayout>} />
              <Route path="/carteira" element={<AppLayout><Carteira /></AppLayout>} />
              <Route path="/checkin" element={<AppLayout><CheckIn /></AppLayout>} />
              <Route path="/agenda" element={<AppLayout><Agenda /></AppLayout>} />
              <Route path="/perfil" element={<AppLayout><Profile /></AppLayout>} />
              <Route path="/missoes" element={<AppLayout><Missoes /></AppLayout>} />
              <Route path="/rede" element={<AppLayout wide><Rede /></AppLayout>} />
              <Route path="/equipe" element={<AppLayout><Equipe /></AppLayout>} />
              <Route path="/rede/novo" element={<AppLayout wide><CadastroPDVCompleto /></AppLayout>} />
              <Route path="/pdv/:code" element={<PdvCapture />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="promoters" element={<AdminPromoters />} />
                <Route path="leads" element={<AdminLeads />} />
                <Route path="saques" element={<AdminSaques />} />
                <Route path="ranking" element={<AdminRanking />} />
                {/* Omnichannel IA */}
                <Route path="inbox" element={<AdminInbox />} />
                <Route path="ai-agents" element={<AdminAiAgents />} />
                <Route path="campaigns" element={<AdminCampaigns />} />
                <Route path="radar-b2b" element={<AdminRadarB2B />} />
                {/* Operação */}
                <Route path="tarefas" element={<AdminTarefas />} />
                <Route path="kanban" element={<AdminKanban />} />
                {/* Administração */}
                <Route path="catalogo" element={<AdminProdutos />} />
                <Route path="marcas" element={<AdminMarcas />} />
                <Route path="usuarios" element={<AdminUsuarios />} />
                <Route path="configuracoes" element={<AdminConfig />} />
                <Route path="config/whatsapp" element={<WhatsAppConfig />} />
                <Route path="portfolio" element={<AdminPortfolio />} />                {/* Financeiro */}
                <Route path="auditoria-fotos" element={<AdminAuditoriaFotos />} />
                <Route path="comissoes-kyc" element={<AdminComissoesKyc />} />
                <Route path="ecosystem" element={<ProspectLeadEcosystem />} />
                <Route path="revisao-kyc" element={<AdminRevisaoKyc />} />
                {/* Rede PDV */}
                <Route path="leads-pdv" element={<AdminPlaceholder title="Leads PDV" description="Leads capturados via QR Code nos pontos de venda." />} />
                <Route path="venda-rapida" element={<PDV />} />
                <Route path="fila-oportunidades" element={<FilaOportunidadesFinal />} />
                <Route path="pdvs" element={<AdminPlaceholder title="Pontos de Venda" description="Cadastro e gestão de PDVs ativos." />} />
              </Route>
              <Route path="/rh" element={<RhLayout />}>
                <Route index element={<RhDashboard />} />
                <Route path="promoters" element={<RhPromoters />} />
                <Route path="pagamentos" element={<RhPagamentos />} />
              </Route>
              <Route path="/admin/visualizador" element={<VisualizadorLayout />}>
                <Route index element={<AdminVisualizador />} />
                <Route path="leads" element={<AdminLeads />} />
                <Route path="promoters" element={<AdminPromoters />} />
                <Route path="saques" element={<AdminSaques />} />
                <Route path="ranking" element={<AdminRanking />} />
                <Route path="inbox" element={<AdminInbox />} />
                <Route path="ai-agents" element={<AdminPlaceholder title="Agentes de IA" description="Configuração de agentes inteligentes para qualificação e atendimento." />} />
                <Route path="campaigns" element={<AdminPlaceholder title="Motor de Campanhas" description="Disparos automatizados e jornadas de marketing." />} />
                <Route path="radar-b2b" element={<AdminPlaceholder title="Radar B2B" description="Captura automática de empresas e oportunidades B2B." />} />
              </Route>
              <Route path="*" element={<NotFound />} />
              </Routes>
              <OfflineStatus />
            </ProspectingTimerProvider>
          </SyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
