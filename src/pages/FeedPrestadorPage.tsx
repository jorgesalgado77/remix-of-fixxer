import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { usePerformanceMode } from "@/hooks/use-performance-mode";

import {
  ArrowLeft,
  Search,
  MessageSquare,
  Bookmark,
  Star,
  Zap,
  MapPin,
  Clock,
  Wrench,
  Ruler,
  Hammer,
  ClipboardList,
  PenTool,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Play,
  User,
  Store,
  Flame,
} from "lucide-react";

// =============================================================================
// TIPOS
// =============================================================================

type Subcategory =
  | "Conferência Técnica"
  | "Medição Fina"
  | "Montagem de Móveis"
  | "Instalação"
  | "Projetos/Desenho";

type ContractType = "lojista" | "cliente_final";

type MediaItem = { type: "image" | "video"; url: string; poster?: string };

type JobPost = {
  id: string;
  type: ContractType;
  contractor: {
    id: string;
    name: string;
    initials: string;
    isVerified?: boolean;
  };
  city: string;
  state: string;
  rating: number;
  postedAt: string;
  urgency: "normal" | "urgente" | "critica";
  subcategory: Subcategory;
  title: string;
  description: string;
  requirements: string[];
  tools: string[];
  value: string;
  valueType: "fixo" | "percentual";
  media: MediaItem[];
};

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_JOBS: JobPost[] = [
  {
    id: "os-101",
    type: "lojista",
    contractor: {
      id: "c-lojista-1",
      name: "Marcenaria Inovamad",
      initials: "MI",
      isVerified: true,
    },
    city: "Sorocaba",
    state: "SP",
    rating: 4.8,
    postedAt: "há 25 min",
    urgency: "urgente",
    subcategory: "Conferência Técnica",
    title: "Conferência Técnica e Medição Fina de Cozinha Alto Padrão",
    description:
      "Projeto de cozinha planejada em L com ilha central. Precisamos de conferência técnica completa antes da produção: conferir medidas finais, apontar interferências e validar compatibilidade de ferragens.",
    requirements: [
      "Experiência com cozinhas alto padrão",
      "Conhecimento em ferragens Blum/Hettich",
      "Kit completo de medição",
    ],
    tools: ["Trena laser", "Nível de bolha", "Gabinete de referência"],
    value: "R$ 250,00 fixo ou 3% do contrato",
    valueType: "percentual",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=70&auto=format&fit=crop",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=70&auto=format&fit=crop",
      },
    ],
  },
  {
    id: "os-102",
    type: "cliente_final",
    contractor: {
      id: "c-cliente-1",
      name: "Mariana Souza",
      initials: "MS",
    },
    city: "Votorantim",
    state: "SP",
    rating: 5.0,
    postedAt: "há 12 min",
    urgency: "critica",
    subcategory: "Montagem de Móveis",
    title: "Montagem Urgente de Roupeiro 6 Portas",
    description:
      "Roupeiro novo na caixa, precisa ser montado hoje à tarde. Apartamento no 4º andar com elevador. Cliente final com avaliação máxima na plataforma.",
    requirements: [
      "Montagem de roupeiro com gavetões",
      "Paciência com ajustes finos",
      "Limpar área ao final",
    ],
    tools: ["Furadeira/parafusadeira", "Jogo de chaves Allen", "Nível"],
    value: "R$ 200,00",
    valueType: "fixo",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=70&auto=format&fit=crop",
      },
    ],
  },
  {
    id: "os-103",
    type: "lojista",
    contractor: {
      id: "c-lojista-2",
      name: "Móveis Bianchi",
      initials: "MB",
      isVerified: true,
    },
    city: "Jundiaí",
    state: "SP",
    rating: 4.9,
    postedAt: "há 1 h",
    urgency: "normal",
    subcategory: "Instalação",
    title: "Instalação Completa de Closet Planejado em Apartamento",
    description:
      "Closet com 4,5m de largura, incluindo sapateira, gaveteiros e prateleiras. Instalação em parede de drywall requer fixação reforçada.",
    requirements: [
      "Experiência com fixação em drywall",
      "Organização de acabamentos",
      "Entrega de checklist final",
    ],
    tools: ["Parafusadeira impacto", "Buscas vigas", "Cola PU"],
    value: "R$ 680,00",
    valueType: "fixo",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&q=70&auto=format&fit=crop",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1200&q=70&auto=format&fit=crop",
      },
    ],
  },
  {
    id: "os-104",
    type: "cliente_final",
    contractor: {
      id: "c-cliente-2",
      name: "Júlio Menezes",
      initials: "JM",
    },
    city: "Sorocaba",
    state: "SP",
    rating: 4.7,
    postedAt: "há 2 h",
    urgency: "normal",
    subcategory: "Medição Fina",
    title: "Medição Fina para Dormitório Completo (3 ambientes)",
    description:
      "Apartamento em reforma. Preciso de medidor para 3 dormitórios, passando as medidas finas para a marcenaria produzir os móveis planejados.",
    requirements: [
      "Mínimo 2 anos de experiência",
      "Entrega de memorial descritivo",
      "Disponibilidade pela manhã",
    ],
    tools: ["Trena 8m", "Nível laser", "Câmera para registros"],
    value: "R$ 180,00",
    valueType: "fixo",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1616627451515-9d3c1a4d4c65?w=1200&q=70&auto=format&fit=crop",
      },
    ],
  },
  {
    id: "os-105",
    type: "lojista",
    contractor: {
      id: "c-lojista-3",
      name: "Loja Móveis Premium",
      initials: "MP",
      isVerified: true,
    },
    city: "Campinas",
    state: "SP",
    rating: 4.6,
    postedAt: "há 3 h",
    urgency: "urgente",
    subcategory: "Projetos/Desenho",
    title: "Desenho Técnico de Cozinha para Cliente Final Premium",
    description:
      "Cliente busca projeto executivo completo com renderização. Loja fornece as medidas brutas e referências de estilo. Entrega em 5 dias úteis.",
    requirements: [
      "Domínio de Promob ou similar",
      "Renderização realista",
      "Lista de materiais detalhada",
    ],
    tools: ["Promob", "SketchUp", "V-Ray/Lumion"],
    value: "R$ 450,00 + 2% do contrato fechado",
    valueType: "percentual",
    media: [
      {
        type: "video",
        url: "https://videos.pexels.com/video-files/4258906/4258906-hd_1920_1080_25fps.mp4",
        poster:
          "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=70&auto=format&fit=crop",
      },
    ],
  },
  {
    id: "os-106",
    type: "cliente_final",
    contractor: {
      id: "c-cliente-3",
      name: "Ana Projetos",
      initials: "AP",
    },
    city: "Itu",
    state: "SP",
    rating: 4.9,
    postedAt: "há 4 h",
    urgency: "normal",
    subcategory: "Montagem de Móveis",
    title: "Montagem de Escrivaninha e Estante Home Office",
    description:
      "Dois móveis novos para montagem em home office. Cliente possui manual e ferragens organizadas. Preferência por trabalho silencioso.",
    requirements: [
      "Montagem limpa e organizada",
      "Furar parede para fixação",
      "Retirar embalagens",
    ],
    tools: ["Jogo de chaves", "Furadeira", "Aspirador de pó"],
    value: "R$ 150,00",
    valueType: "fixo",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1581092919535-9a3f7f6f6a25?w=1200&q=70&auto=format&fit=crop",
      },
    ],
  },
];

const FILTERS: { key: "todas" | Subcategory; label: string; icon: React.ReactNode }[] = [
  { key: "todas", label: "Todas as Vagas", icon: null },
  {
    key: "Conferência Técnica",
    label: "Conferência Técnica",
    icon: <ClipboardList className="w-3 h-3" />,
  },
  { key: "Medição Fina", label: "Medição Fina", icon: <Ruler className="w-3 h-3" /> },
  { key: "Montagem de Móveis", label: "Montagem de Móveis", icon: <Hammer className="w-3 h-3" /> },
  { key: "Instalação", label: "Instalação", icon: <Wrench className="w-3 h-3" /> },
  { key: "Projetos/Desenho", label: "Projetos/Desenho", icon: <PenTool className="w-3 h-3" /> },
];

const SAVES_STORAGE_KEY = "fixxer_prestador_saves_v1";

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

function UrgencyBadge({ urgency }: { urgency: JobPost["urgency"] }) {
  if (urgency === "critica") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[8px] font-black uppercase tracking-widest">
        <Flame className="w-2.5 h-2.5" /> Urgente
      </span>
    );
  }
  if (urgency === "urgente") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[8px] font-black uppercase tracking-widest">
        <Clock className="w-2.5 h-2.5" /> Rápido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground text-[8px] font-black uppercase tracking-widest">
      <Clock className="w-2.5 h-2.5" /> Normal
    </span>
  );
}

function TypeBadge({ type }: { type: ContractType }) {
  if (type === "lojista") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/20 text-[#00FF87] text-[8px] font-black uppercase tracking-widest">
        <Store className="w-2.5 h-2.5" /> Lojista
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest">
      <User className="w-2.5 h-2.5" /> Cliente Final
    </span>
  );
}

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3 h-3 text-amber-400 fill-current" />
      <span className="text-[10px] font-black text-white">{value.toFixed(1)}</span>
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FF87]/20 to-[#00FF87]/5 border border-[#00FF87]/20 flex items-center justify-center text-[11px] font-black text-[#00FF87] italic">
      {initials}
    </div>
  );
}

// =============================================================================
// MODAL DE CANDIDATURA
// =============================================================================

function ApplyModal({
  job,
  isOpen,
  onClose,
}: {
  job: JobPost | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !job) return null;

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    toast.success("Candidatura enviada!", {
      description: `Você se candidatou à O.S. ${job.id} de ${job.contractor.name}.`,
    });
    setMessage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#1A1A1B] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <h3 className="text-sm font-black text-white uppercase italic tracking-tight">
            Candidatar-se à O.S.
          </h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{job.title}</p>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Contratante
            </span>
            <span className="text-[10px] font-black text-white">{job.contractor.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Valor</span>
            <span className="text-[10px] font-black text-[#00FF87]">{job.value}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Cidade</span>
            <span className="text-[10px] font-black text-white">
              {job.city}/{job.state}
            </span>
          </div>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escreva uma mensagem breve para o contratante..."
          className="w-full min-h-[100px] bg-black/30 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-muted-foreground outline-none focus:border-[#00FF87]/50 resize-none"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#00FF87] text-black font-black uppercase italic text-xs tracking-widest hover:shadow-[0_0_20px_rgba(0,255,135,0.4)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" /> Confirmar Candidatura
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// LIGHTBOX
// =============================================================================

function Lightbox({ job, index, onClose }: { job: JobPost; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % job.media.length);
  }, [job.media.length]);

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + job.media.length) % job.media.length);
  }, [job.media.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, next, prev]);

  const item = job.media[current];

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative w-full max-w-4xl max-h-[80vh] flex items-center justify-center">
        {job.media.length > 1 && (
          <button
            onClick={prev}
            className="absolute left-2 md:left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {item.type === "video" ? (
          <video
            src={item.url}
            poster={item.poster}
            controls
            className="max-w-full max-h-[80vh] rounded-2xl border border-white/10"
          />
        ) : (
          <img
            src={item.url}
            alt={`Mídia ${current + 1}`}
            className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/10"
          />
        )}

        {job.media.length > 1 && (
          <button
            onClick={next}
            className="absolute right-2 md:right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {job.media.length > 1 && (
        <div className="flex items-center gap-2 mt-4">
          {job.media.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-[#00FF87]" : "bg-white/20"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CARD DE O.S.
// =============================================================================

function JobCard({
  job,
  saved,
  onToggleSave,
  onApply,
  onLightbox,
}: {
  job: JobPost;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onApply: (job: JobPost) => void;
  onLightbox: (job: JobPost, index: number) => void;
}) {
  const navigate = useNavigate();
  const isClientFinal = job.type === "cliente_final";

  return (
    <article
      className={`relative rounded-3xl border bg-[#1A1A1B] overflow-hidden transition-all hover:border-[#00FF87]/30 group ${
        isClientFinal
          ? "border-[#00FF87]/30 shadow-[0_0_20px_rgba(0,255,135,0.08)]"
          : "border-white/10"
      }`}
    >
      {isClientFinal && (
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00FF87] to-transparent" />
      )}

      <div className="p-4 space-y-4">
        {/* CABEÇALHO */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar initials={job.contractor.initials} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-black text-white uppercase italic truncate">
                  {job.contractor.name}
                </h3>
                {job.contractor.isVerified && <CheckCircle2 className="w-3 h-3 text-[#00FF87]" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-[#00FF87]" /> {job.city}/{job.state}
                </span>
                <RatingStars value={job.rating} />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <TypeBadge type={job.type} />
                <UrgencyBadge urgency={job.urgency} />
              </div>
            </div>
          </div>
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
            {job.postedAt}
          </span>
        </div>

        {/* ESPECIFICAÇÕES */}
        <div className="space-y-2">
          <h4 className="text-[13px] font-black text-white uppercase italic leading-tight group-hover:text-[#00FF87] transition-colors">
            {job.title}
          </h4>
          <p className="text-[10px] text-muted-foreground font-medium leading-relaxed line-clamp-3">
            {job.description}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {job.subcategory && (
              <span className="px-2 py-0.5 rounded-md bg-[#00FF87]/10 border border-[#00FF87]/20 text-[#00FF87] text-[8px] font-black uppercase tracking-widest">
                {job.subcategory}
              </span>
            )}
            {job.requirements.slice(0, 2).map((req, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-muted-foreground text-[8px] font-bold uppercase tracking-widest"
              >
                {req}
              </span>
            ))}
          </div>

          {job.tools.length > 0 && (
            <div className="text-[9px] text-muted-foreground">
              <span className="font-bold text-white/70 uppercase">Ferramentas:</span>{" "}
              {job.tools.join(", ")}
            </div>
          )}
        </div>

        {/* MÍDIA */}
        {job.media.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {job.media.map((item, i) => (
              <button
                key={i}
                onClick={() => onLightbox(job, i)}
                className="relative shrink-0 w-28 h-20 rounded-xl overflow-hidden border border-white/10 bg-black/40 group/media focus:outline-none focus:ring-2 focus:ring-[#00FF87]/50"
              >
                {item.type === "video" ? (
                  <>
                    <img
                      src={item.poster || item.url}
                      alt=""
                      className="w-full h-full object-cover opacity-80 group-hover/media:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-6 h-6 text-white fill-current" />
                    </div>
                  </>
                ) : (
                  <img
                    src={item.url}
                    alt=""
                    className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-500"
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* VALOR E AÇÕES */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex flex-col">
            <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">
              Remuneração
            </span>
            <span className="text-xs font-black text-[#00FF87]">{job.value}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(job.id)}
              className={`p-2.5 rounded-xl border transition-all ${
                saved
                  ? "bg-[#00FF87]/10 border-[#00FF87]/30 text-[#00FF87]"
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              }`}
              aria-label={saved ? "Remover dos salvos" : "Salvar vaga"}
            >
              <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
            </button>

            <button
              onClick={() =>
                toast.info("Chat Direto iniciado", {
                  description: `Abrindo conversa com ${job.contractor.name}...`,
                })
              }
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-[#00FF87]/10 hover:border-[#00FF87]/30 transition-all"
              aria-label="Chat direto"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button
              onClick={() => onApply(job)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00FF87] text-black font-black uppercase italic text-[9px] tracking-widest hover:shadow-[0_0_20px_rgba(0,255,135,0.4)] active:scale-[0.98] transition-all"
            >
              <Zap className="w-3.5 h-3.5" /> Candidatar-se
            </button>
          </div>
        </div>
      </div>

      {/* GLOW DECORATIVO */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#00FF87]/5 blur-3xl rounded-full pointer-events-none" />
    </article>
  );
}

// =============================================================================
// PÁGINA PRINCIPAL
// =============================================================================

export default function FeedPrestadorPage() {
  const navigate = useNavigate();
  const { glassClass } = usePerformanceMode();

  const [filter, setFilter] = useState<"todas" | Subcategory>("todas");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [applyFor, setApplyFor] = useState<JobPost | null>(null);
  const [lightbox, setLightbox] = useState<{ job: JobPost; index: number } | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce de busca
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 220);
    return () => clearTimeout(t);
  }, [search]);

  // Carregar salvos
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVES_STORAGE_KEY);
      if (raw) setSaved(new Set(JSON.parse(raw)));
    } catch {
      // ignore
    }
  }, []);

  // Persistir salvos
  useEffect(() => {
    try {
      localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify([...saved]));
    } catch {
      // ignore
    }
  }, [saved]);

  // Filtro + busca
  const filtered = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    return MOCK_JOBS.filter((job) => {
      const matchesFilter = filter === "todas" || job.subcategory === filter;
      if (!matchesFilter) return false;
      if (!term) return true;
      const hay =
        `${job.title} ${job.description} ${job.contractor.name} ${job.city} ${job.state} ${job.subcategory}`.toLowerCase();
      return hay.includes(term);
    });
  }, [debouncedSearch, filter]);

  // Paginação por scroll infinito
  const paged = useMemo(() => filtered.slice(0, page * 4), [filtered, page]);
  const hasMore = paged.length < filtered.length;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          setTimeout(() => {
            setPage((p) => p + 1);
            setLoadingMore(false);
          }, 400);
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore]);

  const toggleSave = useCallback((id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success("Vaga removida dos salvos");
      } else {
        next.add(id);
        toast.success("Vaga salva com sucesso");
      }
      return next;
    });
  }, []);

  const searching = search !== debouncedSearch;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-foreground pb-24 animate-in fade-in duration-500">
      {/* TOPBAR FIXO */}
      <header className="sticky top-0 z-50 bg-[#0A0A0B]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/dashboard/prestador" })}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all shrink-0"
              aria-label="Voltar para dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#00FF87]" /> Feed do Prestador
              </h1>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest truncate">
                Mural de Oportunidades e O.S.
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-3 p-3 rounded-2xl border border-white/10 ${glassClass}`}
          >
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por palavra-chave ou cidade..."
              className="bg-transparent border-none outline-none text-xs text-white w-full font-medium placeholder:text-muted-foreground"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* FILTRO ROLAGEM HORIZONTAL */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                    active
                      ? "bg-[#00FF87] text-black border-[#00FF87] shadow-[0_0_15px_rgba(0,255,135,0.3)]"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Skeleton de busca */}
        {searching && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-3xl bg-[#1A1A1B] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        )}

        {!searching && filtered.length === 0 && (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Search className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-black text-white uppercase italic tracking-tight">
              Nenhuma vaga encontrada
            </p>
            <p className="text-[10px] text-muted-foreground mt-2 max-w-xs mx-auto">
              Tente ajustar o filtro de subcategoria ou refinar sua busca por "{debouncedSearch}".
            </p>
            <button
              onClick={() => {
                setFilter("todas");
                setSearch("");
              }}
              className="mt-4 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
            >
              Limpar Filtros
            </button>
          </div>
        )}

        {!searching &&
          paged.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved={saved.has(job.id)}
              onToggleSave={toggleSave}
              onApply={setApplyFor}
              onLightbox={(job, index) => setLightbox({ job, index })}
            />
          ))}

        {/* Sentinel de scroll infinito */}
        {!searching && filtered.length > 0 && (
          <div ref={sentinelRef} className="py-4 text-center">
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <div className="w-4 h-4 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
                Carregando mais vagas...
              </div>
            )}
            {!hasMore && !loadingMore && (
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                — Fim do feed —
              </span>
            )}
          </div>
        )}
      </main>

      {/* MODAIS */}
      <ApplyModal job={applyFor} isOpen={!!applyFor} onClose={() => setApplyFor(null)} />

      {lightbox && (
        <Lightbox job={lightbox.job} index={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
