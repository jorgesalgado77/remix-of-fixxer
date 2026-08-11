import { useState, useEffect } from "react";
import { ShieldCheck, Crown, Info, History, Loader2, ExternalLink, Download, ChevronDown, ChevronUp, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { type ResolvedProfile } from "@/lib/identity/identity-types";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { resolveDocumentUrl } from "@/lib/profile-documents";
import { resolveIdentity } from "@/lib/identity/identity-service";
import { toast } from "sonner";

interface AuditEntry {
  id: string;
  type: 'plan_upgrade' | 'cnpj_verification';
  status: string;
  description?: string;
  note?: string;
  metadata?: any;
  created_at: string;
}

export function ProfileStatusSection({ profile: initialProfile }: { profile: ResolvedProfile }) {
  const [profile, setProfile] = useState<ResolvedProfile>(initialProfile);
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // 1. Polling/Subscription para atualização automática de status
  useEffect(() => {
    const userId = initialProfile.identity.id;
    if (!userId) return;

    // Subscription Realtime para a tabela profiles
    const channel = supabaseExternal
      .channel(`profile-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        async (payload) => {
          console.log("Profile updated detected:", payload.new);
          // Recarrega a identidade via IdentityService (que limpa cache se necessário)
          const updated = await resolveIdentity(userId, { refresh: true });
          setProfile(updated);
          toast.info("Status da conta atualizado em tempo real.");
        }
      )
      .subscribe();

    return () => {
      supabaseExternal.removeChannel(channel);
    };
  }, [initialProfile.identity.id]);

  // 2. Busca histórico detalhado
  useEffect(() => {
    if (!profile.identity.id || !showHistory) return;
    
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabaseExternal
          .from('system_audit')
          .select('*')
          .eq('user_id', profile.identity.id)
          .in('event_type', ['plan_upgrade', 'cnpj_verification'])
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          // Normaliza campos (event_type -> type)
          setAuditHistory(data.map(d => ({ ...d, type: d.event_type })) as AuditEntry[]);
        }
      } catch (e) {
        console.error("Erro ao buscar histórico:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [profile.identity.id, showHistory]);

  const handleDownloadDoc = async (path: string, fileName: string) => {
    try {
      const url = await resolveDocumentUrl(path);
      if (!url) throw new Error("URL não gerada");
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download iniciado.");
    } catch (e) {
      toast.error("Falha ao gerar link de download.");
    }
  };

  const identity = profile.identity;
  const isPremium = identity.planId === 'premium';
  const isVerified = identity.verificationStatus === 'verified' || identity.isVerified;
  const isPending = identity.verificationStatus === 'pending';

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Card de Plano */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4 group hover:border-amber-400/30 transition-all">
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
                className="bg-amber-400 text-black font-black text-[10px] uppercase tracking-tighter shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:scale-105 active:scale-95 transition-all"
                onClick={() => window.dispatchEvent(new CustomEvent('fixxer:open-plan-details'))}
              >
                Upgrade Ouro
              </Button>
            )}
            {isPremium && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <Info className="w-3 h-3" />
            <span>O Selo Ouro é exclusivo para assinantes Premium.</span>
          </div>
        </div>

        {/* Card de Verificação */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4 group hover:border-primary/30 transition-all">
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
                className="border-primary/50 text-primary font-black text-[10px] uppercase tracking-tighter hover:bg-primary/10 transition-all"
                onClick={() => {
                  const el = document.getElementById('verification-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  toast.info("Role para baixo até a seção de documentos.");
                }}
              >
                Verificar Agora
              </Button>
            )}
            {isVerified && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {isPending && <Loader2 className="w-5 h-5 animate-spin text-blue-400" />}
          </div>
          {identity.verificationNote && (
            <div className="p-3 rounded-xl bg-red-400/5 border border-red-400/10 flex items-start gap-2">
              <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-400 leading-tight">{identity.verificationNote}</p>
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
                  <div key={entry.id} className="flex flex-col">
                    <div 
                      className="p-4 flex items-start justify-between gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                      onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-bold text-white uppercase tracking-tighter">
                            {entry.type === 'plan_upgrade' ? 'Upgrade de Plano' : 'Verificação de CNPJ'}
                          </p>
                          {expandedEntry === entry.id ? <ChevronUp className="w-3 h-3 text-white/30" /> : <ChevronDown className="w-3 h-3 text-white/30" />}
                        </div>
                        <p className="text-[9px] text-white/50">{new Date(entry.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          entry.status === 'approved' || entry.status === 'verified' || entry.status === 'success' ? 'bg-emerald-400/10 text-emerald-400' :
                          entry.status === 'rejected' || entry.status === 'failed' ? 'bg-red-400/10 text-red-400' :
                          'bg-blue-400/10 text-blue-400'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>
                    
                    {expandedEntry === entry.id && (
                      <div className="px-4 pb-4 pt-0 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        {entry.description && (
                          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                            <p className="text-[10px] text-white/70 leading-relaxed italic">{entry.description}</p>
                          </div>
                        )}
                        
                        {/* Detalhes do Backend (Payload/Metadata) */}
                        {entry.metadata && (
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Detalhes Técnicos</p>
                            <div className="p-3 bg-black/40 border border-white/5 rounded-xl font-mono text-[9px] text-emerald-400/80 overflow-x-auto">
                              <pre>{JSON.stringify(entry.metadata, null, 2)}</pre>
                            </div>
                          </div>
                        )}

                        {/* Comprovantes / Downloads */}
                        {entry.metadata?.document_path && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-white/10 hover:border-primary/50 text-[10px] font-bold uppercase tracking-tighter w-full sm:w-auto"
                            onClick={() => handleDownloadDoc(entry.metadata.document_path, `comprovante-${entry.id}.pdf`)}
                          >
                            <Download className="w-3 h-3 mr-2" />
                            Baixar Comprovante
                          </Button>
                        )}
                        
                        {entry.type === 'plan_upgrade' && entry.status === 'success' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-white/10 hover:border-amber-400/50 text-[10px] font-bold uppercase tracking-tighter w-full sm:w-auto text-amber-300"
                            onClick={() => toast.info("Link para recibo fiscal enviado por e-mail.")}
                          >
                            <FileText className="w-3 h-3 mr-2" />
                            Visualizar Recibo
                          </Button>
                        )}
                      </div>
                    )}
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
