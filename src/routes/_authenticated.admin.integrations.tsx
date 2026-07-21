import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { Database, ShieldCheck, AlertCircle, RefreshCw, Key } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/integrations")({
  component: IntegrationsSettings,
});

function IntegrationsSettings() {
  const { glassClass } = usePerformanceMode();
  const [status, setStatus] = useState<"checking" | "active" | "inactive">("checking");
  const [testing, setTesting] = useState(false);
  const [dbInfo, setDbInfo] = useState({
    url: import.meta.env.VITE_SUPABASE_URL || "Não configurado",
    key: import.meta.env.VITE_SUPABASE_ANON_KEY ? "••••••••••••••••" : "Não configurado"
  });

  const checkConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.from('admin_config').select('id').limit(1);
      if (error) throw error;
      setStatus("active");
      toast.success("Conexão com Supabase estabelecida com sucesso!");
    } catch (err: any) {
      console.error("Erro de conexão:", err);
      setStatus("inactive");
      toast.error(`Falha na conexão: ${err.message || 'Verifique as chaves no ambiente'}`);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Configurações de Integração</h1>
        <p className="text-muted-foreground">Gerencie a conectividade com serviços externos.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className={`${glassClass} border border-white/10 rounded-3xl p-8 bg-black/40`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${status === 'active' ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-500'}`}>
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Supabase Cloud Backend</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-primary animate-pulse' : 'bg-red-500'}`} />
                  <span className={`text-xs font-bold uppercase tracking-widest ${status === 'active' ? 'text-primary' : 'text-red-500'}`}>
                    {status === 'active' ? 'Conectado' : status === 'checking' ? 'Verificando...' : 'Desconectado'}
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={checkConnection}
              disabled={testing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-bold">Testar Conexão</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Database className="w-3 h-3" /> Supabase URL
              </label>
              <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-sm text-primary break-all">
                {dbInfo.url}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Key className="w-3 h-3" /> Anon Public Key
              </label>
              <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-sm text-primary/40">
                {dbInfo.key}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-white">Instruções de Configuração:</strong><br />
              Para alterar as chaves reais, acesse o painel do <strong className="text-primary">Lovable</strong>, vá em 
              <span className="text-white"> Project Settings &gt; Secrets / Environment Variables</span> e adicione as variáveis 
              <code className="bg-black/40 px-1 rounded text-primary mx-1">VITE_SUPABASE_URL</code> e 
              <code className="bg-black/40 px-1 rounded text-primary ml-1">VITE_SUPABASE_ANON_KEY</code>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
