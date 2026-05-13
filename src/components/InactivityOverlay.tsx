import { useEffect, useState } from "react";
import { useProspectingTimer, formatElapsedSince } from "@/hooks/useProspectingTimer";
import { Button } from "@/components/ui/button";
import { Timer, Flame, Pause, Lightbulb } from "lucide-react";

export default function InactivityOverlay() {
  const { inactivePaused, pausedSince, resume, dismissInactive } = useProspectingTimer();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!inactivePaused) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [inactivePaused]);

  if (!inactivePaused || !pausedSince) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-warning/15 flex items-center justify-center ring-4 ring-warning/30">
            <Timer className="w-12 h-12 text-warning" />
          </div>
        </div>

        {/* Card */}
        <div className="border-2 border-warning/40 rounded-3xl p-6 space-y-5 bg-card">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/15 text-warning text-xs font-bold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse-dot" />
              Turno pausado
            </span>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold leading-tight">
              Opa! Seu turno foi
              <br />
              pausado por inatividade.
            </h2>
            <p className="text-sm text-muted-foreground">
              Notamos que você está há mais de 1 hora sem prospectar. Seu tempo parou de
              contar.
            </p>
          </div>

          <div className="bg-muted rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Tempo parado
            </p>
            <p className="text-3xl font-bold text-warning mt-1 tabular-nums">
              {formatElapsedSince(pausedSince)}
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-success/10 border border-success/20">
            <Lightbulb className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80">
              Cada lead cadastrado pode valer até <strong>R$ 2,00</strong>. Não deixe o
              dinheiro parado!
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={resume}
            className="w-full h-14 text-base font-bold bg-success hover:bg-success/90 text-success-foreground"
          >
            <Flame className="w-5 h-5 mr-2" /> VOLTAR PARA A RUA
          </Button>
          <Button
            onClick={dismissInactive}
            variant="ghost"
            className="w-full h-11 text-muted-foreground"
          >
            <Pause className="w-4 h-4 mr-2" /> Manter pausado por agora
          </Button>
        </div>
      </div>
    </div>
  );
}
