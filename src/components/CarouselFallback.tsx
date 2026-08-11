import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface CarouselErrorFallbackProps {
  title: string;
  error: string | null;
  onRetry: () => void;
  className?: string;
}

export function CarouselErrorFallback({
  title,
  error,
  onRetry,
  className = ""
}: CarouselErrorFallbackProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 bg-[#121214] border border-red-500/20 rounded-3xl ${className}`}>
      <Alert variant="destructive" className="bg-red-500/5 border-red-500/20 mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-red-400 font-bold uppercase tracking-tighter italic">Erro de Conexão</AlertTitle>
        <AlertDescription className="text-white/60 text-xs">
          {error || "Não foi possível carregar os dados. Verifique sua conexão ou tente novamente."}
        </AlertDescription>
      </Alert>
      
      <div className="text-center mb-6">
        <h3 className="font-black italic uppercase text-white text-lg tracking-tighter mb-2">
          {title}
        </h3>
        <p className="text-xs text-white/40">
          Houve um problema ao carregar esta seção. Isso foi registrado para nossa equipe técnica.
        </p>
      </div>

      <Button 
        onClick={onRetry}
        variant="outline"
        className="border-white/10 hover:bg-white/5 text-white gap-2 uppercase italic font-black text-[10px]"
      >
        <RefreshCcw className="w-3 h-3" />
        Tentar Novamente
      </Button>
    </div>
  );
}

export function CarouselLoadingFallback() {
  return (
    <div className="flex gap-4 overflow-hidden py-4">
      {[1, 2, 3, 4].map((i) => (
        <div 
          key={i} 
          className="min-w-[280px] h-[180px] bg-white/5 border border-white/10 rounded-2xl animate-pulse"
        />
      ))}
    </div>
  );
}
