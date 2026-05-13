import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";

interface TimerCtx {
  seconds: number;
  running: boolean;
  inactivePaused: boolean;
  pausedSince: number | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  registerActivity: () => void;
  dismissInactive: () => void;
}

const Ctx = createContext<TimerCtx>({} as TimerCtx);
const KEY = "prospec_timer_v1";
const ACTIVITY_KEY = "prospec_last_activity_v1";
const INACTIVE_KEY = "prospec_inactive_paused_v1";
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1h
const CHECK_INTERVAL_MS = 30 * 1000; // verifica a cada 30s

export function ProspectingTimerProvider({ children }: { children: ReactNode }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [inactivePaused, setInactivePaused] = useState(false);
  const [pausedSince, setPausedSince] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const checkRef = useRef<number | null>(null);

  // Hidratar estado
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const { seconds: s, running: r, lastTick } = JSON.parse(raw);
        let base = s ?? 0;
        if (r && lastTick) base += Math.floor((Date.now() - lastTick) / 1000);
        setSeconds(base);
        setRunning(!!r);
      } catch {}
    }
    const inactiveRaw = localStorage.getItem(INACTIVE_KEY);
    if (inactiveRaw) {
      try {
        const { since } = JSON.parse(inactiveRaw);
        if (since) {
          setInactivePaused(true);
          setPausedSince(since);
        }
      } catch {}
    }
  }, []);

  // Tick do contador
  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  // Persistir timer
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ seconds, running, lastTick: Date.now() }));
  }, [seconds, running]);

  // Persistir estado de inatividade
  useEffect(() => {
    if (inactivePaused && pausedSince) {
      localStorage.setItem(INACTIVE_KEY, JSON.stringify({ since: pausedSince }));
    } else {
      localStorage.removeItem(INACTIVE_KEY);
    }
  }, [inactivePaused, pausedSince]);

  // Verificador de inatividade
  useEffect(() => {
    if (!running) return;
    const check = () => {
      const lastRaw = localStorage.getItem(ACTIVITY_KEY);
      const last = lastRaw ? Number(lastRaw) : Date.now();
      if (Date.now() - last >= INACTIVITY_LIMIT_MS) {
        setRunning(false);
        setInactivePaused(true);
        setPausedSince(Date.now());
      }
    };
    check();
    checkRef.current = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      if (checkRef.current) window.clearInterval(checkRef.current);
    };
  }, [running]);

  const start = () => {
    setSeconds(0);
    setRunning(true);
    setInactivePaused(false);
    setPausedSince(null);
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  };

  const pause = () => setRunning(false);

  const resume = () => {
    setRunning(true);
    setInactivePaused(false);
    setPausedSince(null);
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  };

  const stop = () => {
    setRunning(false);
    setSeconds(0);
    setInactivePaused(false);
    setPausedSince(null);
    localStorage.removeItem(KEY);
    localStorage.removeItem(ACTIVITY_KEY);
    localStorage.removeItem(INACTIVE_KEY);
  };

  const registerActivity = useCallback(() => {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  }, []);

  const dismissInactive = useCallback(() => {
    setInactivePaused(false);
    setPausedSince(null);
  }, []);

  return (
    <Ctx.Provider
      value={{
        seconds,
        running,
        inactivePaused,
        pausedSince,
        start,
        pause,
        resume,
        stop,
        registerActivity,
        dismissInactive,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useProspectingTimer = () => useContext(Ctx);

export function formatTimer(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatElapsedSince(ms: number) {
  const total = Math.floor((Date.now() - ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}min ${s}s`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}
