import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { generateAISuggestion, AISuggestionType } from '@/lib/info-products/ai-assistant.functions';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AIAssistantButtonProps {
  type: AISuggestionType;
  context: any;
  onAccept: (suggestion: string) => void;
  label?: string;
  className?: string;
}

export function AIAssistantButton({ type, context, onAccept, label = "Gerar sugestão", className }: AIAssistantButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const generate = useServerFn(generateAISuggestion);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generate({ data: { type, context } });
      setResult(data.suggestion);
      setProvider(data.provider);
      setShowResult(true);
    } catch (error: any) {
      toast.error(error.message || "Falha ao gerar sugestão com IA");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (result) {
      onAccept(result);
      setShowResult(false);
      toast.success("Sugestão da IA aplicada!");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={handleGenerate}
        className={`bg-white/5 border-white/10 hover:bg-primary/10 hover:border-primary/50 text-[10px] h-8 px-3 gap-1.5 uppercase font-black tracking-widest transition-all ${className}`}
        title="✨ IA Assistente: Clique para obter uma sugestão inteligente baseada no seu conteúdo"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
        ) : (
          <Sparkles className="w-3 h-3 text-primary shadow-[0_0_10px_rgba(0,255,135,0.5)]" />
        )}
        {label}
      </Button>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="bg-[#0A0A0B] border-white/10 rounded-[32px] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 italic uppercase font-black tracking-tighter">
              <Sparkles className="w-5 h-5 text-primary" />
              Sugestão da IA
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Revisado por {provider}. Você pode editar antes de aceitar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <textarea
              className="w-full min-h-[150px] bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              value={result || ''}
              onChange={(e) => setResult(e.target.value)}
            />
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button 
              variant="ghost" 
              onClick={() => setShowResult(false)}
              className="rounded-xl font-bold uppercase tracking-widest text-[10px] text-muted-foreground"
            >
              <X className="w-4 h-4 mr-2" />
              Descartar
            </Button>
            <Button 
              onClick={handleAccept}
              className="bg-primary text-primary-foreground rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              <Check className="w-4 h-4 mr-2" />
              Aceitar e Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
