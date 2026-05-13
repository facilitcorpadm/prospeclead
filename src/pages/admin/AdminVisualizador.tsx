import AdminDashboard from "./AdminDashboard";

/**
 * Página inicial do perfil "Visualizador" (somente leitura).
 *
 * Reutiliza o `AdminDashboard` para evitar duplicação. O modo somente
 * leitura é fornecido pelo `VisualizadorLayout` através do
 * `ReadOnlyProvider`, então qualquer botão de ação dentro dessa
 * tela é automaticamente escondido/desabilitado.
 *
 * Layout (sidebar + header próprios) já é fornecido pelo
 * `VisualizadorLayout`. Aqui só renderizamos o conteúdo central.
 */
export default function AdminVisualizador() {
  return <AdminDashboard />;
}
