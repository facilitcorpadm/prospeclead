import { useState } from "react";
import { LeadList, ChatSession } from "@/components/chat/LeadList";
import { ChatArea } from "@/components/chat/ChatArea";
import { Card } from "@/components/ui/card";

export default function AdminInbox() {
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

  return (
    <div className="h-[calc(100vh-120px)] w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Caixa de Entrada</h1>
        <p className="text-sm text-muted-foreground">
          Histórico omnichannel de conversas (WhatsApp) geradas pelo n8n
        </p>
      </div>
      <Card className="h-[calc(100%-70px)] flex overflow-hidden rounded-xl border-border shadow-sm">
        <LeadList
          selectedSessionId={selectedSession?.session_id}
          onSelectSession={setSelectedSession}
        />
        <ChatArea session={selectedSession} />
      </Card>
    </div>
  );
}
