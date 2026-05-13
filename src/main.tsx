import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { forceSystemUpdate } from './lib/hard-reset'
import './index.css'

// PWA: Registro silencioso do Service Worker
registerSW({ immediate: false });
// forceSystemUpdate(); // Desativado para evitar recarregamentos indesejados durante o uso

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Falha ao encontrar o elemento root");

createRoot(rootElement).render(<App />);
