import { supabase } from "@/integrations/supabase/client";

interface SendAdminWhatsAppMessageParams {
  sessionId: string;
  message: string;
}

interface OpenWhatsAppOptions {
  leadName?: string | null;
  senderName?: string | null;
  vehicleModel?: string | null;
  kind?: "b2c" | "b2b" | string | null;
}

export function normalizePhoneBR(phone?: string | null) {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;

  return digits.length >= 12 ? digits : "";
}

export function openWhatsApp(phone?: string | null, options: OpenWhatsAppOptions = {}) {
  const normalized = normalizePhoneBR(phone);
  if (!normalized) return false;

  const firstName = options.leadName?.trim()?.split(/\s+/)?.[0] ?? "";
  const sender = options.senderName?.trim()?.split(/\s+/)?.[0] ?? "";
  const product = options.kind === "b2b" ? "sua operação" : options.vehicleModel || "seu veículo";

  const text = [
    `Olá${firstName ? ` ${firstName}` : ""}, tudo bem?`,
    sender ? `Aqui é ${sender}.` : undefined,
    `Estou entrando em contato sobre ${product}.`,
  ]
    .filter(Boolean)
    .join(" ");

  window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  return true;
}

export async function sendAdminWhatsAppMessage({
  sessionId,
  message,
}: SendAdminWhatsAppMessageParams) {
  const recipient = normalizePhoneBR(sessionId) || sessionId.replace(/\D/g, "");

  const { data, error } = await supabase.functions.invoke("whatsapp-handler?action=send", {
    body: {
      action: "send",
      phone: recipient,
      message,
    },
  });

  if (error) throw error;
  return data;
}