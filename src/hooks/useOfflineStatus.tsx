import { useEffect, useState } from "react";

/**
 * Hook leve que devolve `true` quando `navigator.onLine === false`.
 * Em browsers `online`/`offline` são eventos confiáveis para este propósito,
 * embora não sejam garantia absoluta de conectividade real (a checagem real
 * acontece quando `useSync` tenta de fato falar com o Supabase).
 */
export function useOfflineStatus(): boolean {
  const [offline, setOffline] = useState<boolean>(() => {
    if (typeof navigator === "undefined") return false;
    return !navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return offline;
}
