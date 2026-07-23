import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

function ChatPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6 pb-32">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black uppercase italic text-xl tracking-tight">Chat</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              Suas conversas em tempo real
            </p>
          </div>
        </div>

        <div className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-10 text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="font-black uppercase italic text-lg mb-2">Nenhuma conversa ainda</h2>
          <p className="text-sm text-muted-foreground">
            Quando você iniciar um contato com um lojista, prestador ou parceiro, as mensagens aparecem aqui.
          </p>
        </div>
      </div>
    </div>
  );
}
