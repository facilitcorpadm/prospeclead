import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge Function para receber Webhooks da API do WhatsApp (Meta).
 * Substitui o n8n para recebimento de mensagens.
 */
Deno.serve(async (req) => {
  const { method } = req;
  const url = new URL(req.url);

  // 1. Verificação do Webhook pela Meta (GET)
  if (method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // O token de verificação deve ser configurado como Secret no Supabase
    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "prospeclead_2026_A7f9Xz";

    if (mode && token) {
      if (mode === "subscribe" && token === verifyToken) {
        console.log("WEBHOOK_VERIFIED");
        return new Response(challenge, { status: 200 });
      } else {
        console.warn("Verify token mismatch");
        return new Response("Forbidden", { status: 403 });
      }
    }
    return new Response("Bad Request", { status: 400 });
  }

  // 2. Processamento de Mensagens Recebidas (POST)
  if (method === "POST") {
    try {
      const body = await req.json();
      
      // Ignorar se não for um evento de mensagem válido
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        for (const msg of messages) {
          const from = msg.from; // Número do telefone do lead
          let content = "";

          // Extrair conteúdo baseado no tipo
          if (msg.type === "text") {
            content = msg.text.body;
          } else if (msg.type === "image") {
            content = "[Imagem recebida]";
          } else if (msg.type === "audio") {
            content = "[Áudio recebido]";
          } else {
            content = `[Mensagem tipo: ${msg.type}]`;
          }

          console.log(`Recebendo mensagem de ${from}: ${content}`);

          // Salvar no histórico do chat
          const { error } = await supabase
            .from("n8n_chat_histories")
            .insert({
              session_id: from,
              message: {
                type: "human",
                content: content,
                id: msg.id,
                from: from
              },
              hora_data_mensagem: new Date().toISOString()
            });

          if (error) {
            console.error("Erro ao salvar no Supabase:", error);
          }
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch (error) {
      console.error("Erro ao processar Webhook:", error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});
