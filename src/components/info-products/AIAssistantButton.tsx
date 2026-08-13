import { Sparkles, Loader2, Check, X, History, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { generateAISuggestion, AISuggestionType, getAICreatorStats } from '@/lib/info-products/ai-assistant.functions';
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
  showComparison?: boolean;
}

export function AIAssistantButton({ type, context, onAccept, label = "Gerar sugestão", className, showComparison }: AIAssistantButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [stats, setStats] = useState<{ used: number; limit: number } | null>(null);
  
  const generate = useServerFn(generateAISuggestion);
  const getStats = useServerFn(getAICreatorStats);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStats();
        setStats({ used: data.used, limit: data.limit });
      } catch (e) {
        console.error("Erro ao buscar estatísticas de IA", e);
      }
    };
    fetchStats();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generate({ data: { type, context } });
      setResult(data.suggestion);
      setProvider(data.provider);
      setShowResult(true);
      // Salvar no histórico local
      setHistory(prev => [data.suggestion, ...prev.slice(0, 4)]);
      // Atualizar stats localmente para feedback imediato
      if (stats) setStats(prev => prev ? { ...prev, used: prev.used + 1 } : null);
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

  const revertTo = (val: string) => {
    setResult(val);
    toast.info("Valor restaurado do histórico");
  };

  return (
    <>
      <div className="flex flex-col items-end gap-1">
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
        {stats && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/10 rounded-full">
            <Zap className="w-2 h-2 text-amber-400" />
            <span className="text-[8px] text-muted-foreground font-bold uppercase">{stats.used}/{stats.limit} IA</span>
          </div>
        )}
      </div>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="bg-[#0A0A0B] border-white/10 rounded-[32px] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between italic uppercase font-black tracking-tighter">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Sugestão da IA
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowHistory(!showHistory)}
                className="h-8 rounded-xl bg-white/5 border border-white/10 text-[10px] uppercase font-bold"
              >
                <History className="w-3 h-3 mr-2" />
                Histórico
              </Button>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Gerado por {provider}. Revise e edite antes de aplicar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {showComparison && context.currentValue && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Texto Atual</label>
                <div className="w-full min-h-[150px] bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-muted-foreground text-sm opacity-60">
                  {context.currentValue}
                </div>
              </div>
            )}
            
            <div className={`space-y-2 ${showComparison && context.currentValue ? '' : 'lg:col-span-2'}`}>
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">Nova Sugestão</label>
              <textarea
                className="w-full min-h-[150px] bg-white/5 border border-primary/20 rounded-2xl p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                value={result || ''}
                onChange={(e) => setResult(e.target.value)}
              />
            </div>

            {showHistory && history.length > 0 && (
              <div className="lg:col-span-2 space-y-3 pt-4 border-t border-white/10">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <RotateCcw className="w-3 h-3" />
                  Sugestões Anteriores
                </label>
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <button 
                      key={i} 
                      onClick={() => revertTo(h)}
                      className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all group"
                    >
                      <p className="text-xs text-muted-foreground line-clamp-2 italic">{h}</p>
                      <span className="text-[8px] font-bold text-primary opacity-0 group-hover:opacity-100 uppercase mt-1">Clique para restaurar</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0 mt-4">
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
