import { useState, useEffect } from "react";
import { ShieldCheck, Crown, Info, History, Loader2, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { type ResolvedProfile } from "@/lib/identity/identity-types";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";

interface AuditEntry {
  id: string;
  type: 'plan_upgrade' | 'cnpj_verification';
  status: string;
  note?: string;
  created_at: string;
}

export function ProfileStatusSection({ profile }: { profile: ResolvedProfile }) {
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!profile.identity.id || !showHistory) return;
    
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabaseExternal
          .from('system_audit')
          .select('*')
          .eq('user_id', profile.identity.id)
          .in('type', ['plan_upgrade', 'cnpj_verification'])
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          setAuditHistory(data as AuditEntry[]);
        }
      } catch (e) {
        console.error("Erro ao buscar histórico:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [profile.identity.id, showHistory]);

  const identity = profile.identity;
  const isPremium = identity.planId === 'premium';
  const isVerified = identity.verificationStatus === 'verified' || identity.isVerified;
  const isPending = identity.verificationStatus === 'pending';

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Card de Plano */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 flex items-center justify-center text-amber-400">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Plano Atual</p>
                <p className="font-bold text-white uppercase">{identity.planId}</p>
              </div>
            </div>
            {!isPremium && (
              <Button 
                size="sm" 
                className="bg-amber-400 text-black font-bold text-[10px] uppercase tracking-tighter"
                onClick={() => window.dispatchEvent(new CustomEvent('fixxer:open-plan-details'))}
              >
                Upgrade Ouro
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <Info className="w-3 h-3" />
            <span>O Selo Ouro é exclusivo para assinantes Premium.</span>
          </div>
        </div>

        {/* Card de Verificação */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isVerified ? 'bg-emerald-400/10 text-emerald-400' : isPending ? 'bg-blue-400/10 text-blue-400' : 'bg-white/10 text-white/40'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">CNPJ Verificado</p>
                <p className={`font-bold uppercase ${isVerified ? 'text-emerald-400' : isPending ? 'text-blue-400' : 'text-white/40'}`}>
                  {isVerified ? 'Verificado' : isPending ? 'Em Análise' : 'Não Iniciado'}
                </p>
              </div>
            </div>
            {!isVerified && !isPending && (
              <Button 
                size="sm" 
                variant="outline"
                className="border-primary/50 text-primary font-bold text-[10px] uppercase tracking-tighter"
                onClick={() => {
                  window.location.href = '/profile?focus=verification';
                  toast.info("Iniciando fluxo de verificação...");
                }}
              >
                Verificar Agora
              </Button>
            )}
          </div>
          {identity.verificationNote && (
            <div className="p-3 rounded-xl bg-red-400/5 border border-red-400/10 text-[10px] text-red-400">
              {identity.verificationNote}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-3 h-3 mr-2" />
            {showHistory ? 'Ocultar Histórico' : 'Ver Histórico de Auditoria'}
          </Button>
          <Link to="/ajuda" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1">
            Como funciona? <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {showHistory && (
          <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : auditHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/30 italic">
                Nenhum evento registrado até o momento.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {auditHistory.map((entry) => (
                  <div key={entry.id} className="p-4 flex items-start justify-between gap-4 hover:bg-white/[0.02]">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-white uppercase tracking-tighter">
                        {entry.type === 'plan_upgrade' ? 'Upgrade de Plano' : 'Verificação de CNPJ'}
                      </p>
                      <p className="text-[9px] text-white/50">{new Date(entry.created_at).toLocaleString('pt-BR')}</p>
                      {entry.note && <p className="text-[10px] text-amber-400/70">{entry.note}</p>}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      entry.status === 'approved' || entry.status === 'verified' || entry.status === 'success' ? 'bg-emerald-400/10 text-emerald-400' :
                      entry.status === 'rejected' ? 'bg-red-400/10 text-red-400' :
                      'bg-blue-400/10 text-blue-400'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
