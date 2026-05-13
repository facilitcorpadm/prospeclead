export const forceSystemUpdate = async () => {
  const CURRENT_VERSION = "2.0.1"; // Incrementamos para forçar o reset
  const savedVersion = localStorage.getItem("app_version");

  if (savedVersion !== CURRENT_VERSION) {
    console.log("Detectada versão antiga. Iniciando limpeza de cache...");
    
    // Limpa todos os caches de arquivos (Assets/PWA)
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));

    // Remove o Service Worker antigo
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }

    localStorage.setItem("app_version", CURRENT_VERSION);
    window.location.reload();
  }
};
