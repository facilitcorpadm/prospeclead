
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProspectingTimer } from "@/hooks/useProspectingTimer";
import { useSync } from "@/hooks/useSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Camera, Fuel, Lightbulb, Loader2, MapPin, RotateCcw, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { queueLeadOffline, isNetworkLikeError } from "@/lib/offlineSave";
import { makePhotoPath } from "@/lib/offlineDb";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
const ACCURACY_LIMIT_M = 100;

export default function Frentista() {
  const { user } = useAuth();
  const { registerActivity } = useProspectingTimer();
  const { offline } = useSync();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number; capturedAt: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);

  // Inicia câmera traseira ao vivo
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Câmera não disponível neste navegador");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
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
        setCameraReady(true);
      } catch (e: any) {
        const msg =
          e?.name === "NotAllowedError"
            ? "Permita o acesso à câmera no navegador"
            : e?.name === "NotFoundError"
            ? "Nenhuma câmera encontrada"
            : "Câmera não disponível no preview web. Use o APK instalado no dispositivo.";
        setCameraError(msg);
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Não foi possível capturar a foto");
          return;
        }
        setPhotoBlob(blob);
        setPhotoUrl(URL.createObjectURL(blob));
        setStep(2);
        // Para a câmera após capturar
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCameraReady(false);
      },
      "image/jpeg",
      0.85
    );
  };

  const retake = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoBlob(null);
    setPhotoUrl(null);
    setStep(1);
    setCoords(null);
    // Reabre a câmera
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      } catch {
        setCameraError("Câmera indisponível");
      }
    })();
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      toast.error("GPS indisponível");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        });
        setLocating(false);
        toast.success(`Local confirmado (~${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === err.PERMISSION_DENIED ? "Permita o acesso à localização" : "Não foi possível obter localização");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const submit = async () => {
    if (!user || !photoBlob) return;
    if (!coords) {
      toast.error("Capture sua localização atual");
      return;
    }
    if (!plate.trim()) {
      toast.error("Informe a placa");
      return;
    }
    setBusy(true);

    const basePayload: Omit<LeadInsert, "photo_url"> = {
      user_id: user.id,
      kind: "b2c",
      name: `Placa ${plate.toUpperCase()}`,
      vehicle_plate: plate.toUpperCase(),
      status: "coletado",
      latitude: coords.lat,
      longitude: coords.lng,
      location_accuracy: coords.accuracy,
      captured_at: coords.capturedAt,
    };

    const saveOffline = async (msg: string) => {
      await queueLeadOffline({
        user_id: user.id,
        source: "frentista",
        payload: basePayload,
        photoBlob,
      });
      registerActivity();
      toast.success(msg);
      navigate("/leads?tab=b2c");
    };

    if (offline) {
      try {
        await saveOffline("Salvo localmente — enviaremos quando voltar a internet");
      } catch (e: any) {
        toast.error(e?.message ?? "Não foi possível salvar localmente");
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      const path = makePhotoPath(user.id);
      const { error: upErr } = await supabase.storage
        .from("lead-photos")
        .upload(path, photoBlob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;

      const payload: LeadInsert = { ...basePayload, photo_url: path };
      const { error } = await supabase.from("leads").insert(payload);
      if (error) throw error;

      registerActivity();
      toast.success("Lead registrado!");
      navigate("/leads?tab=b2c");
    } catch (e: any) {
      if (isNetworkLikeError(e)) {
        try {
          await saveOffline("Sem rede agora — salvo localmente e enviaremos depois");
        } catch (offErr: any) {
          toast.error(offErr?.message ?? "Não foi possível salvar localmente");
        }
      } else {
        toast.error(e.message ?? "Erro ao salvar");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[hsl(220,15%,8%)] text-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10">
          <Link to="/"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-destructive/90 flex items-center justify-center">
            <Fuel className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold tracking-wide">MODO FRENTISTA</h1>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 pb-6">
        <StepDot n={1} active={step >= 1} done={step > 1} />
        <div className={`h-0.5 w-12 ${step > 1 ? "bg-success" : "bg-white/20"}`} />
        <StepDot n={2} active={step >= 2} done={false} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 pb-6 text-center">
        {step === 1 ? (
          <>
            <h2 className="text-2xl font-bold tracking-wide">
              APONTE A CÂMERA<br />PARA A PLACA
            </h2>
            <p className="text-sm text-white/60 mt-2">Foto comprimida e enviada ao servidor</p>

            {/* Live camera viewport (escondido, só usamos para captura) */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`mt-6 rounded-2xl w-full max-w-sm aspect-[4/3] object-cover bg-black/40 ${cameraReady ? "" : "opacity-30"}`}
            />

            {/* Botão grande de capturar */}
            <button
              type="button"
              onClick={takePhoto}
              disabled={!cameraReady}
              className="mt-8 relative w-44 h-44 rounded-full bg-success text-white flex flex-col items-center justify-center shadow-[0_0_60px_hsl(var(--success)/0.6)] active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-12 h-12" strokeWidth={2.2} />
              <span className="mt-1 text-sm font-bold tracking-wide">FOTO<br />DA PLACA</span>
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold tracking-wide">CONFIRMAR CADASTRO</h2>
            <p className="text-sm text-white/60 mt-2">Revise e finalize</p>

            {photoUrl && (
              <img src={photoUrl} alt="Placa capturada" className="mt-5 w-full max-w-sm aspect-[4/3] rounded-2xl object-cover border border-white/10" />
            )}

            <div className="w-full max-w-sm mt-5 space-y-4 text-left">
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs uppercase tracking-wide">Placa</Label>
                <Input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="ABC1D23"
                  maxLength={8}
                  className="bg-white/5 border-white/10 text-white text-lg font-mono tracking-widest text-center placeholder:text-white/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs uppercase tracking-wide">Local</Label>
                {!coords ? (
                  <Button
                    type="button"
                    onClick={captureGPS}
                    disabled={locating}
                    className="w-full h-12 bg-white/10 hover:bg-white/15 text-white border border-white/15"
                  >
                    {locating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Capturando GPS…</>
                    ) : (
                      <><MapPin className="w-4 h-4 mr-2" /> Confirmar localização agora</>
                    )}
                  </Button>
                ) : (
                  <div className={`rounded-xl border p-3 ${coords.accuracy <= ACCURACY_LIMIT_M ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <CheckCircle2 className={`w-4 h-4 ${coords.accuracy <= ACCURACY_LIMIT_M ? "text-success" : "text-warning"}`} />
                        Local confirmado
                      </div>
                      <span className="text-xs text-white/60">~{Math.round(coords.accuracy)}m</span>
                    </div>
                    <p className="text-xs text-white/60 mt-1 tabular-nums">
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full max-w-sm mt-4 space-y-3">
              <Button type="button" onClick={submit} disabled={busy || !coords || !plate.trim()} className="w-full h-14 bg-success hover:bg-success/90 text-white text-base font-semibold shadow-lg shadow-success/30">
                {busy ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  <><CheckCircle2 className="w-5 h-5 mr-2" /> CONFIRMAR LEAD</>
                )}
              </Button>
              
              <Button type="button" variant="outline" onClick={retake} className="w-full h-11 bg-transparent border-white/15 text-white hover:bg-white/10">
                <RotateCcw className="w-4 h-4 mr-2" /> Refazer foto
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Dica */}
      {step === 1 && (
        <div className="mx-4 mb-3 rounded-xl bg-white/5 border border-white/10 p-3 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="text-xs text-white/70 leading-relaxed">
            Enquadre a placa com boa iluminação.<br />
            A foto será enviada ao servidor em até 30 s.
          </div>
        </div>
      )}

      {/* Erro de câmera (web preview, etc) */}
      {cameraError && step === 1 && (
        <div className="mx-4 mb-4 rounded-xl bg-destructive text-destructive-foreground p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-sm leading-snug">{cameraError}</div>
        </div>
      )}
    </div>
  );
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
        done ? "bg-success border-success text-white" : active ? "bg-success border-success text-white" : "bg-transparent border-white/30 text-white/50"
      }`}
    >
      {n}
    </div>
  );
}
