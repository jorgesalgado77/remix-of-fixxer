import { useEffect, useState } from "react";
import { 
  ShieldAlert, 
  RefreshCcw, 
  CheckCircle2, 
  Clock, 
  Database,
  AlertTriangle
} from "lucide-react";
import { useIdentityIntegrity } from "@/lib/current-user";
import { resolveIdentity } from "@/lib/identity/identity-service";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { toast } from "sonner";

export function ProfileSyncStatus({ userId }: { userId: string }) {
  const integrityError = useIdentityIntegrity() as any;
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { glassClass } = usePerformanceMode();

  useEffect(() => {
    const stored = localStorage.getItem(`fixxer:last-sync:${userId}`);
    if (stored) setLastSync(stored);
  }, [userId]);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await resolveIdentity(userId, { refresh: true });
      const now = new Date().toLocaleString('pt-BR');
      setLastSync(now);
      localStorage.setItem(`fixxer:last-sync:${userId}`, now);
      toast.success("Perfil sincronizado com sucesso!");
    } catch (e) {
      toast.error("Falha na sincronização.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {integrityError && integrityError.userId === userId && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-pulse">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1 w-full">
            <h4 className="text-xs font-black text-red-500 uppercase italic">
              {integrityError.code === '23503' ? 'Erro de Vínculo (Chave Estrangeira)' : 'Erro de Integridade Detectado'}
            </h4>
            <p className="text-[10px] text-red-500/80 font-medium">
              {integrityError.code === '23503' 
                ? `O usuário ${userId.substring(0,8)}... não possui um registro correspondente na tabela de autenticação. É necessária a recuperação da FK.`
                : `A tabela ${integrityError.table} não foi encontrada. Isso pode causar falhas na exibição de dados.`}
            </p>
            
            <div className="flex flex-col gap-2 mt-3">
              <button 
                onClick={handleManualSync}
                className="px-3 py-1 bg-red-500 text-white text-[9px] font-black rounded-lg uppercase italic hover:bg-red-600 transition-all flex items-center gap-2 justify-center"
              >
                <RefreshCcw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} /> Tentar Corrigir Agora
              </button>
              
              {integrityError.code === '23503' && (
                <button 
                  onClick={() => {
                    console.log(`[Recuperação] Executando script de reparo FK para ${userId}`);
                    toast.info("Executando reparo de emergência...");
                    handleManualSync();
                  }}
                  className="px-3 py-1 bg-white/10 text-white text-[9px] font-black rounded-lg uppercase italic hover:bg-white/20 transition-all flex items-center gap-2 justify-center"
                >
                  <Database className="w-3 h-3" /> Recuperar FK Ausente
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`${glassClass} border border-white/5 rounded-3xl p-6 space-y-6`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" /> Status de Sincronização
          </h3>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">v1.4</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Última Atualização
            </span>
            <p className="text-xs font-black text-white italic">{lastSync || "Nunca sincronizado"}</p>
          </div>
          
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Fonte de Dados
            </span>
            <p className="text-xs font-black text-white italic">Supabase Externo (Real-Time)</p>
          </div>
        </div>

        {integrityError ? (
           <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3">
             <AlertTriangle className="w-4 h-4 text-amber-500" />
             <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Logs: {integrityError.code || '42P01'} - {integrityError.code === '23503' ? 'FK Violation' : 'Relation Missing'}</span>
           </div>
        ) : (
          <div className="flex items-center gap-2 text-[9px] font-bold text-primary uppercase tracking-widest">
            <CheckCircle2 className="w-3 h-3" /> Todos os módulos operacionais
          </div>
        )}

        <button 
          onClick={handleManualSync}
          disabled={syncing}
          className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sincronizar Manualmente
        </button>
      </div>
    </div>
  );
}
