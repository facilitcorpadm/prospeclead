import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Locate, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Coords = { lat: number; lng: number; accuracy: number };

export default function CheckIn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reverse geocoding via Nominatim (OpenStreetMap) — gratuito, sem chave
  const reverseGeocode = async (lat: number, lng: number) => {
    setResolving(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=pt-BR`,
        { headers: { "Accept": "application/json" } }
      );
      const data = await res.json();
      const a = data?.address ?? {};
      const road = a.road || a.pedestrian || a.path || "";
      const number = a.house_number ? `, ${a.house_number}` : "";
      const suburb = a.suburb || a.neighbourhood || a.quarter || "";
      const city = a.city || a.town || a.village || a.municipality || "";
      const parts = [
        [road + number].filter(Boolean).join(""),
        suburb,
        city,
      ].filter(Boolean);
      const pretty = parts.join(" - ") || data?.display_name || "Local atual";
      setName(pretty);
    } catch {
      // silencioso — usuário pode digitar manualmente
    } finally {
      setResolving(false);
    }
  };

  const captureGPS = (auto = false) => {
    if (!navigator.geolocation) {
      if (!auto) toast.error("Geolocalização indisponível");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setCoords(c);
        setLocating(false);
        if (!auto) toast.success(`Localização capturada (~${Math.round(c.accuracy)}m)`);
        reverseGeocode(c.lat, c.lng);
      },
      () => {
        setLocating(false);
        if (!auto) toast.error("Não foi possível obter localização");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Captura automática ao abrir a tela
  useEffect(() => {
    captureGPS(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    await supabase.from("checkins").update({ ended_at: new Date().toISOString() }).eq("user_id", user.id).is("ended_at", null);
    const { error } = await supabase.from("checkins").insert({
      user_id: user.id,
      location_name: name,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    });
    if (!error) await supabase.from("profiles").update({ current_location: name }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Check-in confirmado!"); navigate("/"); }
  };

  return (
    <div className="pb-6">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/"><ArrowLeft className="w-5 h-5" /></Link></Button>
        <h1 className="text-xl font-bold">Check-in</h1>
      </div>

      <div className="px-4">
        <Card className="p-4 space-y-4">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Local atual</Label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={resolving ? "Detectando endereço…" : name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ex: Posto Shell Av. Paulista"
                  className="pl-9"
                  disabled={resolving}
                />
              </div>
              {coords && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-success" />
                  GPS ~{Math.round(coords.accuracy)}m · {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              )}
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={() => captureGPS(false)} disabled={locating || resolving}>
              {locating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Capturando GPS…</>
              ) : resolving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Detectando endereço…</>
              ) : (
                <><Locate className="w-4 h-4 mr-2" /> Atualizar localização</>
              )}
            </Button>

            <Button type="submit" className="w-full h-12 font-bold" disabled={busy || !name || resolving || !coords}>
              {busy ? "Confirmando..." : !coords ? "Aguardando GPS..." : "Confirmar check-in"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
