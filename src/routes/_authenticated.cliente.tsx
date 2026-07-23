import { createFileRoute, Link } from "@tanstack/react-router";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { supabase } from "@/integrations/supabase/client";
import { 
  Home, 
  CheckCircle2, 
  Clock, 
  PlusCircle, 
  FileText, 
  Camera, 
  ShieldCheck, 
  DollarSign, 
  User, 
  ChevronRight,
  ArrowRight,
  Sparkles,
  MapPin,
  Calendar,
  Search,
  Star
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EscrowBadge } from "@/components/EscrowBadge";
import { ReviewModal } from "@/components/ReviewModal";


export const Route = createFileRoute("/_authenticated/cliente")({
  component: ClientePortal,
});

function ClientePortal() {
  const { glassClass } = usePerformanceMode();
  const [activeTab, setActiveTab] = useState<'jornada' | 'publicar' | 'contratacoes'>('jornada');

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">
              PORTAL DO <span className="text-[#00FF87]">CLIENTE</span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Acompanhe sua reforma e contrate profissionais</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <TabButton active={activeTab === 'jornada'} onClick={() => setActiveTab('jornada')} label="Minha Obra" icon={<Clock className="w-3 h-3" />} />
          <Link to="/feed/cliente" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00FF87] text-black font-black uppercase italic text-[10px] tracking-widest hover:shadow-[0_0_15px_rgba(0,255,135,0.3)] transition-all">
             <Search className="w-3 h-3" /> Acessar Feed da Categoria
          </Link>
          <TabButton active={activeTab === 'contratacoes'} onClick={() => setActiveTab('contratacoes')} label="Contratações" icon={<ShieldCheck className="w-3 h-3" />} />
          <Link to="/profile" className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all shrink-0">
            <User className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main>
        {activeTab === 'jornada' && <JornadaObra glassClass={glassClass} />}
        {activeTab === 'publicar' && <PublicarNecessidade glassClass={glassClass} />}
        {activeTab === 'contratacoes' && <MinhasContratacoes glassClass={glassClass} />}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border flex items-center gap-2 shrink-0 ${
        active 
          ? 'bg-[#00FF87] text-black border-[#00FF87] shadow-[0_0_15px_rgba(0,255,135,0.3)]' 
          : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function JornadaObra({ glassClass }: { glassClass: string }) {
  const steps = [
    { id: 1, title: "Preparação da Obra", description: "Elétrica, Gesso e Pintura inicial", status: "completed", date: "Concluído em 15/07" },
    { id: 2, title: "Móveis Planejados", description: "Instalação da marcenaria pela loja", status: "current", date: "Início em 22/07" },
    { id: 3, title: "Acabamentos", description: "Marmoraria, vidros e iluminação", status: "pending", date: "Previsto para 05/08" },
    { id: 4, title: "Limpeza e Entrega", description: "Limpeza pós-obra e vistoria final", status: "pending", date: "Previsto para 10/08" },
  ];

  return (
    <div className="space-y-6">
      <div className={`${glassClass} border border-white/5 rounded-3xl p-6 relative overflow-hidden`}>
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-[#00FF87]" />
          <h2 className="text-sm font-black text-white uppercase italic">Status da Minha Casa</h2>
        </div>
        
        <div className="space-y-4 relative">
          {/* Progress Line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-white/5 md:hidden"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {steps.map((step) => (
              <div key={step.id} className={`p-4 rounded-2xl border transition-all ${
                step.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20' :
                step.status === 'current' ? 'bg-[#00FF87]/10 border-[#00FF87] shadow-[0_0_15px_rgba(0,255,135,0.1)]' :
                'bg-white/5 border-white/10 opacity-50'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    step.status === 'completed' ? 'bg-emerald-500 text-black border-emerald-500' :
                    step.status === 'current' ? 'bg-[#00FF87] text-black border-[#00FF87]' :
                    'bg-black/40 text-muted-foreground border-white/10'
                  }`}>
                    {step.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-black">{step.id}</span>}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${step.status === 'current' ? 'text-[#00FF87]' : 'text-white'}`}>
                    Step {step.id}
                  </span>
                </div>
                <h3 className="text-xs font-black text-white mb-1 uppercase italic">{step.title}</h3>
                <p className="text-[9px] text-muted-foreground font-medium mb-3">{step.description}</p>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground uppercase">
                  <Calendar className="w-3 h-3" /> {step.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicarNecessidade({ glassClass }: { glassClass: string }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("Arquivo muito grande", {
          description: "O tamanho máximo permitido é 5MB.",
        });
        return;
      }
      if (!selectedFile.type.startsWith('image/')) {
        toast.error("Formato inválido", {
          description: "Por favor, selecione uma imagem (JPG, PNG, WEBP).",
        });
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.target);
      const title = formData.get('title') as string;
      const city = formData.get('city') as string;
      const category = formData.get('category') as string;
      const details = formData.get('details') as string;

      let fileUrl = "";
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(`publicacoes/${fileName}`, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(`publicacoes/${fileName}`);
        fileUrl = publicUrl;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Inserção com lógica de notificação via trigger no banco
      const { data: newPost, error } = await supabase
        .from('feed_posts')
        .insert({
          title,
          content: details,
          category,
          location: city,
          author_id: user.id,
          type: 'b2c',
          media_url: fileUrl,
          metadata: {
            status: 'active',
            source: 'cliente_portal'
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Necessidade publicada!", {
        description: `Sua demanda de ${category} em ${city} já está visível para os prestadores.`,
      });
      
      e.target.reset();
      setFile(null);
      setPreview(null);
    } catch (error: any) {
      console.error("Erro ao publicar:", error);
      toast.error("Erro ao publicar", {
        description: error.message || "Ocorreu um erro inesperado.",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
        <div className="flex items-center gap-2 mb-6">
          <PlusCircle className="w-5 h-5 text-[#00FF87]" />
          <h2 className="text-sm font-black text-white uppercase italic">O que você precisa hoje?</h2>
        </div>
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Título da Necessidade</label>
            <input 
              name="title"
              required
              placeholder="Ex: Adequar pontos elétricos na cozinha" 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#00FF87] outline-none transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Cidade</label>
              <input 
                name="city"
                required
                placeholder="Ex: São Paulo" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#00FF87] outline-none transition-all font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Categoria Principal</label>
              <select name="category" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#00FF87] outline-none transition-all font-medium appearance-none">
                <option value="Elétrica">Elétrica</option>
                <option value="Gesso">Gesso / Sanca</option>
                <option value="Pintura">Pintura</option>
                <option value="Limpeza">Limpeza Pós-Obra</option>
                <option value="Reparos">Pequenos Reparos</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Detalhes do que precisa</label>
            <textarea 
              name="details"
              rows={4}
              placeholder="Descreva aqui o que precisa ser feito..." 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#00FF87] outline-none transition-all font-medium resize-none"
            ></textarea>
          </div>

          <div className="relative">
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
            <label 
              htmlFor="file-upload"
              className="block p-4 border-2 border-dashed border-white/10 rounded-xl hover:border-[#00FF87]/50 transition-all cursor-pointer group overflow-hidden"
            >
              {preview ? (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-[#00FF87]" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-2">
                  <Camera className="w-6 h-6 text-muted-foreground group-hover:text-[#00FF87] transition-colors" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Anexar Projeto/Foto da Obra</span>
                </div>
              )}
            </label>
          </div>

          <button 
            disabled={loading}
            type="submit"
            className="w-full py-4 rounded-xl bg-[#00FF87] text-black font-black uppercase italic text-xs tracking-widest hover:shadow-[0_0_20px_rgba(0,255,135,0.4)] transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Publicando..." : "Publicar Necessidade no Feed"}
            {!loading && <SendIcon />}
          </button>
        </form>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-6">
          <h3 className="text-xs font-black text-blue-400 uppercase italic mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Dica de Especialista
          </h3>
          <p className="text-[10px] text-blue-100/70 font-medium leading-relaxed">
            Ao anexar o projeto técnico enviado pelo seu lojista, os prestadores conseguem dar orçamentos muito mais precisos e rápidos.
          </p>
        </div>
        
        <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
           <h3 className="text-xs font-black text-white uppercase italic mb-4">Minhas Publicações Ativas</h3>
           <div className="space-y-3">
             <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between hover:border-white/20 transition-all cursor-pointer">
               <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-white uppercase">Ponto Elétrico Cozinha</span>
                 <span className="text-[8px] text-muted-foreground uppercase">Publicado hoje • 3 Propostas</span>
               </div>
               <ChevronRight className="w-4 h-4 text-muted-foreground" />
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function MinhasContratacoes({ glassClass }: { glassClass: string }) {
  const [confirming, setConfirming] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRelease = async () => {
    if (!confirming) return;
    setLoading(true);
    
    try {
      // Chama a função RPC para liberar o escrow e avaliar
      const { error } = await supabase.rpc('complete_and_release_escrow', {
        _post_id: confirming.id,
        _rating: rating,
        _comment: comment
      });

      if (error) throw error;

      toast.success("Serviço concluído!", {
        description: "Pagamento liberado e avaliação registrada com sucesso.",
      });
      setConfirming(null);
    } catch (error: any) {
      console.error("Erro ao liberar escrow:", error);
      toast.error("Erro ao finalizar", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Pagamento em Custódia Protegida FIXXER
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <EscrowBadge />
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Saldo liberado apenas após sua confirmação</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ContractCard 
          id="C-102"
          name="Carlos Eduardo"
          role="Eletricista"
          value={450}
          status="Em Execução"
          onRelease={() => setConfirming({ id: 'dummy-id-1', name: 'Carlos Eduardo' })}
          glassClass={glassClass}
        />
        <ContractCard 
          id="C-105"
          name="Marcos Gesso"
          role="Gesseiro"
          value={1200}
          status="Pagamento Liberado"
          isCompleted
          glassClass={glassClass}
        />
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${glassClass} border border-white/10 p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-2xl`}>
             <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
               <ShieldCheck className="w-8 h-8 text-[#00FF87]" />
             </div>
             <div className="text-center">
               <h3 className="text-lg font-black text-white uppercase italic">Finalizar Contratação?</h3>
               <p className="text-xs text-muted-foreground font-medium mt-2">
                 Libere o pagamento para <strong>{confirming.name}</strong> e deixe sua avaliação.
               </p>
             </div>

             <div className="space-y-4">
               <div className="flex justify-center gap-2">
                 {[1, 2, 3, 4, 5].map((star) => (
                   <button 
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-all ${rating >= star ? 'text-yellow-400 scale-110' : 'text-white/20'}`}
                   >
                     ★
                   </button>
                 ))}
               </div>
               
               <textarea 
                placeholder="Como foi o serviço? (Opcional)"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#00FF87] outline-none transition-all font-medium resize-none"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
               />
             </div>

             <div className="flex flex-col gap-2">
               <button 
                 disabled={loading}
                 onClick={handleRelease}
                 className="w-full py-3 rounded-xl bg-[#00FF87] text-black font-black uppercase italic text-xs tracking-widest transition-all disabled:opacity-50"
               >
                 {loading ? "Processando..." : "Liberar & Avaliar"}
               </button>
               <button 
                 disabled={loading}
                 onClick={() => setConfirming(null)}
                 className="w-full py-3 rounded-xl bg-white/5 text-muted-foreground font-bold uppercase text-[10px] tracking-widest"
               >
                 Voltar
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}


function ContractCard({ id, name, role, value, status, onRelease, isCompleted, glassClass }: any) {
  return (
    <div className={`${glassClass} border ${isCompleted ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5'} p-5 rounded-3xl space-y-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-primary font-black uppercase italic">
            {name.charAt(0)}
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase italic">{name}</h4>
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{role}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[8px] font-bold text-muted-foreground uppercase block">Garantia FIXXER</span>
          <span className="text-xs font-black text-white italic">R$ {value.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`}></div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${isCompleted ? 'text-emerald-400' : 'text-blue-400'}`}>
            {status}
          </span>
        </div>
        
        {!isCompleted && (
          <button 
            onClick={onRelease}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-[#00FF87] hover:text-black border border-white/10 hover:border-[#00FF87] transition-all text-[9px] font-black uppercase italic"
          >
            Liberar Pagamento
            <DollarSign className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}