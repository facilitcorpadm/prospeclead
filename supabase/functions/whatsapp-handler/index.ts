import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, client-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID") ?? "";
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN") ?? "";
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN") ?? "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

async function logEvent(supabase: ReturnType<typeof createClient>, entry: Record<string, unknown>) {
  try {
    await supabase.from("zapi_logs").insert(entry);
  } catch (e) {
    console.error("Falha ao registrar log Z-API:", e);
  }
}

/**
 * SEND: dispara mensagem via Z-API
 */
async function handleSend(req: Request, supabase: ReturnType<typeof createClient>) {
  const body = await req.json().catch(() => ({}));
  const { phone, message, session_id } = body as { phone?: string; message?: string; session_id?: string };

  const targetPhoneRaw = phone || session_id || "";
  const target = normalizePhone(targetPhoneRaw);

  if (!target || !message) {
    return jsonResponse({ error: "phone e message são obrigatórios" }, 400);
  }

  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
    return jsonResponse({ error: "Credenciais Z-API não configuradas" }, 500);
  }

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  const payload = { phone: target, message };

  let zapiResult: any = null;
  let zapiStatus = 0;
  let errorMsg: string | null = null;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ZAPI_CLIENT_TOKEN ? { "Client-Token": ZAPI_CLIENT_TOKEN } : {}),
      },
      body: JSON.stringify(payload),
    });
    zapiStatus = resp.status;
    zapiResult = await resp.json().catch(() => ({}));
    if (!resp.ok) errorMsg = zapiResult?.error || zapiResult?.message || `HTTP ${resp.status}`;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
  }

  const ok = !errorMsg;
  const zapiMessageId = zapiResult?.messageId || zapiResult?.id || null;

  // Log
  await logEvent(supabase, {
    direction: "outbound",
    action: "send",
    phone: target,
    message,
    status: ok ? "sent" : "failed",
    http_status: zapiStatus,
    zapi_message_id: zapiMessageId,
    error: errorMsg,
    payload,
    response: zapiResult,
  });

  // Espelha no histórico do chat (n8n_chat_histories) para a Inbox
  try {
    await supabase.from("n8n_chat_histories").insert({
      session_id: target,
      message: {
        type: "admin",
        content: message,
        zapi_id: zapiMessageId,
      },
      hora_data_mensagem: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Erro ao espelhar mensagem admin no histórico:", e);
  }

  if (!ok) {
    return jsonResponse({ error: "Falha ao enviar via Z-API", details: zapiResult }, zapiStatus || 500);
  }

  return jsonResponse({ ok: true, result: zapiResult });
}

/**
 * WEBHOOK: recebe POST da Z-API com mensagens recebidas
 */
async function handleWebhook(req: Request, supabase: ReturnType<typeof createClient>) {
  // Validação do Client-Token (segurança)
  if (ZAPI_CLIENT_TOKEN) {
    const incomingToken =
      req.headers.get("client-token") ||
      req.headers.get("Client-Token") ||
      req.headers.get("x-client-token");
    if (incomingToken !== ZAPI_CLIENT_TOKEN) {
      console.warn("Webhook Z-API rejeitado: client-token inválido");
      await logEvent(supabase, {
        direction: "inbound",
        action: "webhook",
        status: "rejected",
        error: "Invalid client-token header",
      });
      return jsonResponse({ error: "Forbidden" }, 403);
    }
  }

  const body = await req.json().catch(() => ({}));

  // Ignora mensagens enviadas por nós mesmos (echo)
  if (body?.fromMe === true) {
    return jsonResponse({ ok: true, ignored: "fromMe" });
  }

  const fromRaw: string = body?.phone || body?.from || "";
  const fromNormalized = normalizePhone(fromRaw);
  let content = "";
  let messageType = "text";

  if (body?.text?.message) {
    content = body.text.message;
  } else if (body?.image) {
    content = body?.image?.caption ? `[Imagem] ${body.image.caption}` : "[Imagem recebida]";
    messageType = "image";
  } else if (body?.audio) {
    content = "[Áudio recebido]";
    messageType = "audio";
  } else if (body?.video) {
    content = "[Vídeo recebido]";
    messageType = "video";
  } else if (body?.document) {
    content = "[Documento recebido]";
    messageType = "document";
  } else if (typeof body?.message === "string") {
    content = body.message;
  } else {
    content = "[Mensagem não suportada]";
  }

  if (!fromNormalized) {
    await logEvent(supabase, {
      direction: "inbound",
      action: "webhook",
      status: "ignored",
      error: "Sem telefone identificável",
      payload: body,
    });
    return jsonResponse({ ok: true, ignored: "no-phone" });
  }

  // Busca lead existente pelo telefone (NÃO sobrescreve dados)
  const { data: lead } = await supabase
    .from("leads")
    .select("id, user_id")
    .eq("phone_normalized", fromNormalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Insere mensagem no histórico de chat (Inbox)
  const { error: histError } = await supabase
    .from("n8n_chat_histories")
    .insert({
      session_id: fromNormalized,
      message: {
        type: "human",
        content,
        message_type: messageType,
        from: fromNormalized,
        zapi_id: body?.messageId || body?.id,
      },
      hora_data_mensagem: new Date().toISOString(),
    });

  if (histError) console.error("Erro ao salvar histórico:", histError);

  // Registra também na tabela whatsapp_messages (vinculada ao lead se existir)
  await supabase.from("whatsapp_messages").insert({
    direction: "inbound",
    phone: fromRaw || fromNormalized,
    phone_normalized: fromNormalized,
    text: content,
    message_type: messageType,
    status: "received",
    meta_message_id: body?.messageId || body?.id || null,
    lead_id: lead?.id ?? null,
    user_id: lead?.user_id ?? null,
    raw_payload: body,
  });

  await logEvent(supabase, {
    direction: "inbound",
    action: "webhook",
    phone: fromNormalized,
    message: content,
    status: "received",
    zapi_message_id: body?.messageId || body?.id || null,
    payload: body,
  });

  return jsonResponse({ ok: true, lead_matched: !!lead });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";

  try {
    // Roteamento por query param ?action=
    if (action === "send" && req.method === "POST") {
      return await handleSend(req, supabase);
    }
    if (action === "webhook" && req.method === "POST") {
      return await handleWebhook(req, supabase);
    }

    // Roteamento por body { action }
    if (req.method === "POST") {
      const cloned = req.clone();
      const body = await cloned.json().catch(() => ({}));
      if (body?.action === "send") {
        // Recria request com mesmo body para handleSend
        const newReq = new Request(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(body) });
        return await handleSend(newReq, supabase);
      }
      if (body?.action === "webhook" || body?.phone || body?.text) {
        const newReq = new Request(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(body) });
        return await handleWebhook(newReq, supabase);
      }
    }

    return jsonResponse({ error: "Ação inválida. Use ?action=send ou ?action=webhook" }, 400);
  } catch (e) {
    console.error("Erro whatsapp-handler:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
