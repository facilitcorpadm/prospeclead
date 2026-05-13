import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
}

/**
 * Modal full-screen com câmera ao vivo (somente câmera traseira do dispositivo,
 * sem opção de galeria). Captura um frame em JPEG e devolve via onCapture.
 */
export default function CameraCapture({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setReady(false);

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Câmera não disponível neste navegador");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e: any) {
        const msg =
          e?.name === "NotAllowedError"
            ? "Permita o acesso à câmera no navegador"
            : e?.name === "NotFoundError"
            ? "Nenhuma câmera encontrada"
            : "Câmera não disponível no preview web. Use o APK no dispositivo.";
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !ready) return;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    c.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Não foi possível capturar a foto");
          return;
        }
        onCapture(blob);
        onClose();
      },
      "image/jpeg",
      0.85
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 max-w-none w-screen h-screen sm:h-screen rounded-none border-0 bg-[hsl(220,15%,8%)] text-white flex flex-col [&>button]:hidden">
        <div className="flex items-center justify-between p-4">
          <h2 className="font-bold tracking-wide">📸 FOTO DA PLACA</h2>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center px-4">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`rounded-2xl w-full max-w-xl aspect-[4/3] object-cover bg-black/40 ${ready ? "" : "opacity-30"}`}
          />
        </div>

        {error ? (
          <div className="m-4 rounded-xl bg-destructive text-destructive-foreground p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-sm leading-snug">{error}</div>
          </div>
        ) : (
          <div className="flex flex-col items-center pb-8 pt-4">
            <button
              type="button"
              onClick={snap}
              disabled={!ready}
              className="relative w-32 h-32 rounded-full bg-success text-white flex flex-col items-center justify-center shadow-[0_0_50px_hsl(var(--success)/0.55)] active:scale-95 transition disabled:opacity-50"
            >
              {ready ? <Camera className="w-10 h-10" strokeWidth={2.2} /> : <Loader2 className="w-10 h-10 animate-spin" />}
              <span className="mt-1 text-xs font-bold tracking-wide">CAPTURAR</span>
            </button>
            <p className="text-xs text-white/60 mt-3">Apenas câmera ao vivo — galeria não permitida.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
