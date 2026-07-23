import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabaseExternal } from "@/lib/supabaseExternal";

import {
  ArrowLeft,
  Search,
  MessageSquare,
  Send,
  Bookmark,
  MoreVertical,
  Star,
  Flame,
  Image as ImageIcon,
  Play,
  X,
  Edit3,
  Trash2,
  Flag,
  MapPin,
  Clock,
  Shield,
  Truck,
  Wrench,
  Store,
  User,
} from "lucide-react";

type FeedCategory = "cliente" | "prestador" | "fornecedor" | "lojista";
type MediaItem = { type: "image" | "video"; url: string; poster?: string };

type FeedPost = {
  id: string;
  category: FeedCategory;
  author: {
    id: string;
    name: string;
    avatarInitials: string;
    isMine?: boolean;
    gold?: boolean;
  };
  rating: number;
  city: string;
  postedAt: string; // ex: "há 10 min"
  title: string;
  description: string;
  budget?: string;
  specialty?: string;
  radiusKm?: number;
  media: MediaItem[];
  keywords: string[];
};

const MOCK_POSTS: FeedPost[] = [
  {
    id: "p1",
    category: "cliente",
    author: { id: "u-mariana", name: "Mariana Souza", avatarInitials: "MS" },
    rating: 5.0,
    city: "Sorocaba, SP",
    postedAt: "há 10 min",
    title: "Montagem Urgente de Guarda-Roupa Casal 6 Portas na Caixa",
    description:
      "Comprei um guarda-roupa 6 portas e preciso de montador experiente para atendimento até sábado. Produto entregue e ainda na embalagem.",
    budget: "R$ 250 – R$ 400",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=70&auto=format&fit=crop",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["guarda-roupa", "montagem", "urgente", "sorocaba"],
  },
  {
    id: "p2",
    category: "cliente",
    author: { id: "u-julio", name: "Júlio Menezes", avatarInitials: "JM" },
    rating: 4.8,
    city: "Votorantim, SP",
    postedAt: "há 42 min",
    title: "Assistência Técnica para Porta de Armário Desnivelada",
    description:
      "Porta de armário de cozinha desalinhada após uso. Preciso de conferente/montador para ajuste fino das dobradiças.",
    budget: "Sob orçamento",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1595515106969-1ad0e6f0edc3?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["assistência", "porta", "armário", "votorantim"],
  },
  {
    id: "p3",
    category: "prestador",
    author: {
      id: "u-carlos",
      name: "Carlos Silva",
      avatarInitials: "CS",
      gold: true,
    },
    rating: 4.9,
    city: "Sorocaba, SP",
    postedAt: "há 2 h",
    specialty: "Conferente Técnico & Medidor Fino",
    radiusKm: 60,
    title: "Conferente Técnico Disponível para a Região Metropolitana",
    description:
      "Especialista em conferência de projetos, medidas finais e apontamentos técnicos. Selo Ouro Fixxer. Atendo lojistas e marcenarias.",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1581092919535-9a3f7f6f6a25?w=1200&q=70&auto=format&fit=crop",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1581091012184-7f0a2b3b8f31?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["conferente", "medidor", "sorocaba", "selo ouro"],
  },
  {
    id: "p4",
    category: "prestador",
    author: { id: "u-ana", name: "Ana Projetos", avatarInitials: "AP" },
    rating: 4.7,
    city: "Itu, SP",
    postedAt: "há 5 h",
    specialty: "Projetista 3D (Promob / Gabster)",
    radiusKm: 80,
    title: "Projetista 3D com Renderização de Alta Fidelidade",
    description:
      "Entrego projetos executivos com renderização foto-realista em 48h. Especialidade em dormitórios e cozinhas planejadas.",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1616627451515-9d3c1a4d4c65?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["projetista", "3d", "promob", "gabster"],
  },
  {
    id: "p5",
    category: "fornecedor",
    author: { id: "u-marmoraria", name: "Marmoraria Granitos & Arte", avatarInitials: "MG" },
    rating: 4.6,
    city: "Sorocaba, SP",
    postedAt: "há 1 dia",
    title: "Tampos de Mármore para Cozinhas Planejadas — Entrega em 5 dias",
    description:
      "Fornecemos tampos, soleiras e nichos em mármore e granito para marmorarias e lojistas parceiros. Corte, polimento e instalação inclusos.",
    budget: "A partir de R$ 890/m²",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=1200&q=70&auto=format&fit=crop",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["mármore", "granito", "tampo", "cozinha"],
  },
  {
    id: "p6",
    category: "fornecedor",
    author: { id: "u-vidros", name: "Vidraçaria Cristal Prime", avatarInitials: "VC" },
    rating: 4.5,
    city: "Campinas, SP",
    postedAt: "há 2 dias",
    title: "Vidros Temperados sob Medida para Portas de Armário",
    description:
      "Corte, lapidação e serigrafia sob demanda. Prazo de 72h para lojistas cadastrados. Frete parceiro para toda a região.",
    budget: "Cotação em 1h",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["vidro", "temperado", "porta", "campinas"],
  },
  {
    id: "p7",
    category: "lojista",
    author: {
      id: "u-euloja",
      name: "Minha Loja (Você)",
      avatarInitials: "ML",
      isMine: true,
    },
    rating: 4.8,
    city: "Sorocaba, SP",
    postedAt: "há 3 h",
    title: "Repasse: Instalação Completa de Cozinha Planejada em Alphaville",
    description:
      "Tenho um projeto executado e preciso de uma marcenaria parceira para instalação em Alphaville na próxima semana. Divisão de comissão negociável.",
    budget: "R$ 3.800 (repasse)",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["repasse", "parceria", "cozinha", "alphaville"],
  },
  {
    id: "p8",
    category: "lojista",
    author: { id: "u-lojaparc", name: "Móveis Bianchi", avatarInitials: "MB" },
    rating: 4.9,
    city: "Jundiaí, SP",
    postedAt: "há 6 h",
    title: "Troca de Demandas entre Marcenarias — Semana Cheia",
    description:
      "Estamos com agenda cheia em Jundiaí e liberamos 3 O.S. para parceiros. Ideal para lojistas com equipe própria de montagem.",
    budget: "3 O.S. disponíveis",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["parceria", "marcenaria", "jundiaí"],
  },
];

const FILTERS: { key: "todos" | FeedCategory; label: string; icon: React.ReactNode }[] = [
  { key: "todos", label: "Todos os Anúncios", icon: null },
  { key: "cliente", label: "Clientes Finais", icon: <Flame className="w-3 h-3" /> },
  { key: "prestador", label: "Prestadores", icon: <Wrench className="w-3 h-3" /> },
  { key: "fornecedor", label: "Fornecedores", icon: <Truck className="w-3 h-3" /> },
  { key: "lojista", label: "Lojistas", icon: <Store className="w-3 h-3" /> },
];

function categoryBadge(cat: FeedCategory) {
  switch (cat) {
    case "cliente":
      return { label: "Cliente Final", icon: <User className="w-3 h-3" /> };
    case "prestador":
      return { label: "Prestador", icon: <Wrench className="w-3 h-3" /> };
    case "fornecedor":
      return { label: "Fornecedor", icon: <Truck className="w-3 h-3" /> };
    case "lojista":
      return { label: "Lojista", icon: <Store className="w-3 h-3" /> };
  }
}

export default function FeedLojistaPage() {
  const [filter, setFilter] = useState<"todos" | FeedCategory>("todos");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ post: FeedPost; index: number } | null>(null);
  const [proposalFor, setProposalFor] = useState<FeedPost | null>(null);
  const [reportFor, setReportFor] = useState<FeedPost | null>(null);
  const [deleteFor, setDeleteFor] = useState<FeedPost | null>(null);
  const [proposalValue, setProposalValue] = useState("");
  const [proposalMsg, setProposalMsg] = useState("");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Clientes Finais sempre no topo quando exibidos
    const byCategory = MOCK_POSTS.filter((p) => filter === "todos" || p.category === filter);
    const filtered = q
      ? byCategory.filter((p) => {
          const hay = [
            p.title,
            p.description,
            p.city,
            p.specialty ?? "",
            p.author.name,
            ...(p.keywords || []),
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        })
      : byCategory;
    return [...filtered].sort((a, b) => {
      if (a.category === "cliente" && b.category !== "cliente") return -1;
      if (b.category === "cliente" && a.category !== "cliente") return 1;
      return 0;
    });
  }, [filter, search]);

  const toggleSaved = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast("Publicação removida dos salvos");
      } else {
        next.add(id);
        toast.success("Publicação salva");
      }
      return next;
    });
  };

  const openChat = (post: FeedPost) => {
    toast(`Abrindo chat com ${post.author.name}...`);
  };

  const submitProposal = () => {
    if (!proposalValue.trim()) {
      toast.error("Informe um valor para a proposta");
      return;
    }
    toast.success("Proposta enviada!", {
      description: `${proposalFor?.author.name} receberá sua oferta de ${proposalValue}.`,
    });
    setProposalFor(null);
    setProposalValue("");
    setProposalMsg("");
  };

  const submitReport = () => {
    toast.success("Denúncia registrada", {
      description: "Nossa equipe irá analisar o conteúdo em até 24h.",
    });
    setReportFor(null);
  };

  const confirmDelete = () => {
    toast.success("Publicação removida");
    setDeleteFor(null);
  };

  return (
    <div
      className="min-h-screen bg-[#0A0A0B] text-white flex flex-col font-sans pb-32"
      onClick={() => setOpenMenu(null)}
    >
      {/* Topbar Fixa */}
      <header className="border-b border-white/10 bg-[#0A0A0B]/95 backdrop-blur-md sticky top-0 z-40 p-3 sm:p-4">
        <div className="max-w-3xl mx-auto grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <Link
            to="/lojista"
            aria-label="Voltar para a Dashboard do Lojista"
            className="w-10 h-10 shrink-0 bg-[#1A1A1B] border border-white/10 rounded-xl flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="relative min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por palavra-chave, cidade ou especialidade..."
              className="w-full bg-[#1A1A1B] border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#00FF87]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50"
                aria-label="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros em Pílulas */}
        <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto pt-3 pb-0.5 scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase whitespace-nowrap tracking-wide flex items-center gap-1.5 transition-all ${
                  active
                    ? "bg-[#00FF87] text-black shadow-[0_0_12px_rgba(0,255,135,0.35)]"
                    : "bg-[#1A1A1B] text-white/60 border border-white/10 hover:text-white"
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Feed */}
      <main className="max-w-3xl mx-auto w-full p-3 sm:p-4 space-y-4 flex-1">
        {visible.length === 0 ? (
          <div className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-10 text-center">
            <Search className="w-10 h-10 mx-auto mb-3 text-white/30" />
            <h3 className="font-black uppercase italic text-base mb-1">Nada encontrado</h3>
            <p className="text-xs text-white/50">
              Tente outro termo ou remova os filtros para ver todas as publicações.
            </p>
          </div>
        ) : (
          visible.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isSaved={saved.has(post.id)}
              menuOpen={openMenu === post.id}
              onToggleMenu={(e) => {
                e.stopPropagation();
                setOpenMenu((v) => (v === post.id ? null : post.id));
              }}
              onCloseMenu={() => setOpenMenu(null)}
              onSave={() => toggleSaved(post.id)}
              onChat={() => openChat(post)}
              onPropose={() => setProposalFor(post)}
              onReport={() => setReportFor(post)}
              onDelete={() => setDeleteFor(post)}
              onEdit={() => toast("Abrindo editor da publicação...")}
              onOpenMedia={(index) => setLightbox({ post, index })}
            />
          ))
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="max-w-4xl w-full max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const m = lightbox.post.media[lightbox.index];
              if (!m) return null;
              if (m.type === "video") {
                return (
                  <video
                    src={m.url}
                    poster={m.poster}
                    controls
                    autoPlay
                    className="max-h-[85vh] max-w-full rounded-2xl"
                  />
                );
              }
              return (
                <img
                  src={m.url}
                  alt={lightbox.post.title}
                  className="max-h-[85vh] max-w-full rounded-2xl object-contain"
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Enviar Proposta */}
      {proposalFor && (
        <ModalShell onClose={() => setProposalFor(null)} title="Enviar Proposta">
          <p className="text-xs text-white/60 mb-4">
            Para: <span className="text-white font-bold">{proposalFor.author.name}</span> ·{" "}
            <span className="text-[#00FF87]">{proposalFor.title}</span>
          </p>
          <label className="block text-[10px] uppercase tracking-widest font-black text-white/60 mb-1">
            Valor da proposta
          </label>
          <input
            value={proposalValue}
            onChange={(e) => setProposalValue(e.target.value)}
            placeholder="R$ 0,00"
            className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#00FF87] mb-3"
          />
          <label className="block text-[10px] uppercase tracking-widest font-black text-white/60 mb-1">
            Mensagem (opcional)
          </label>
          <textarea
            value={proposalMsg}
            onChange={(e) => setProposalMsg(e.target.value)}
            rows={3}
            placeholder="Prazo, condições, escopo..."
            className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#00FF87] resize-none mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setProposalFor(null)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 text-xs font-bold uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={submitProposal}
              className="flex-1 py-2.5 rounded-xl bg-[#00FF87] text-black text-xs font-black uppercase shadow-[0_0_12px_rgba(0,255,135,0.35)]"
            >
              Enviar
            </button>
          </div>
        </ModalShell>
      )}

      {/* Modal Denúncia */}
      {reportFor && (
        <ModalShell onClose={() => setReportFor(null)} title="Denunciar Publicação">
          <p className="text-xs text-white/70 mb-4">
            Confirma a denúncia da publicação{" "}
            <span className="text-white font-bold">"{reportFor.title}"</span> de{" "}
            <span className="text-white font-bold">{reportFor.author.name}</span>? Nossa equipe irá
            revisar o conteúdo.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setReportFor(null)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 text-xs font-bold uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={submitReport}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase"
            >
              Denunciar
            </button>
          </div>
        </ModalShell>
      )}

      {/* Modal Excluir */}
      {deleteFor && (
        <ModalShell onClose={() => setDeleteFor(null)} title="Excluir Publicação">
          <p className="text-xs text-white/70 mb-4">
            Tem certeza que deseja excluir <span className="text-white font-bold">"{deleteFor.title}"</span>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteFor(null)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 text-xs font-bold uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase"
            >
              Excluir
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#1A1A1B] border border-white/10 rounded-3xl p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-black uppercase italic text-sm tracking-tight">{title}</h4>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PostCard({
  post,
  isSaved,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onSave,
  onChat,
  onPropose,
  onReport,
  onDelete,
  onEdit,
  onOpenMedia,
}: {
  post: FeedPost;
  isSaved: boolean;
  menuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onCloseMenu: () => void;
  onSave: () => void;
  onChat: () => void;
  onPropose: () => void;
  onReport: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onOpenMedia: (index: number) => void;
}) {
  const isClient = post.category === "cliente";
  const badge = categoryBadge(post.category);

  return (
    <article
      className={`relative bg-[#1A1A1B] rounded-3xl p-4 sm:p-5 space-y-4 transition-all ${
        isClient
          ? "border-2 border-[#00FF87] shadow-[0_0_22px_rgba(0,255,135,0.18)]"
          : "border border-white/10"
      }`}
    >
      {isClient && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00FF87]/10 text-[#00FF87] text-[10px] font-black uppercase border border-[#00FF87]/30 tracking-widest">
          <Flame className="w-3.5 h-3.5 animate-pulse" />
          Oportunidade · Cliente Final
        </div>
      )}

      {/* Cabeçalho */}
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <div
          className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center font-black text-sm ${
            isClient
              ? "bg-[#0A0A0B] border border-[#00FF87] text-[#00FF87]"
              : "bg-[#0A0A0B] border border-white/10 text-white/80"
          }`}
        >
          {post.author.avatarInitials}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="font-bold text-white text-sm truncate">{post.author.name}</h4>
            <span className="inline-flex items-center gap-1 text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/70">
              {badge.icon}
              {badge.label}
            </span>
            {post.author.gold && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-400/10 border border-yellow-400/40 text-yellow-300 px-2 py-0.5 rounded">
                <Shield className="w-3 h-3" /> Ouro
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/50 mt-0.5">
            <span
              className={`font-bold flex items-center gap-1 ${
                isClient ? "text-[#00FF87]" : "text-yellow-300"
              }`}
            >
              <Star
                className={`w-3 h-3 ${
                  isClient ? "fill-[#00FF87] text-[#00FF87]" : "fill-yellow-300 text-yellow-300"
                }`}
              />
              {post.rating.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {post.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.postedAt}
            </span>
            {post.specialty && (
              <span className="inline-flex items-center gap-1 text-white/70">
                <Wrench className="w-3 h-3" />
                {post.specialty}
              </span>
            )}
            {post.radiusKm && (
              <span className="text-white/60">Raio {post.radiusKm} km</span>
            )}
          </div>
        </div>

        {/* Menu 3 pontinhos */}
        <div className="relative shrink-0">
          <button
            onClick={onToggleMenu}
            className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5"
            aria-label="Mais opções"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1 z-20 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[200px]"
            >
              {post.author.isMine ? (
                <>
                  <button
                    onClick={() => {
                      onCloseMenu();
                      onEdit();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest hover:bg-white/5"
                  >
                    <Edit3 className="w-4 h-4" /> Editar
                  </button>
                  <button
                    onClick={() => {
                      onCloseMenu();
                      onDelete();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest text-red-400 hover:bg-red-500/10 border-t border-white/5"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onCloseMenu();
                    onReport();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest text-red-400 hover:bg-red-500/10"
                >
                  <Flag className="w-4 h-4" /> Denunciar Publicação
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo */}
      <div className="space-y-2">
        <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight leading-snug">
          {post.title}
        </h3>
        <p className="text-xs sm:text-[13px] text-white/70 leading-relaxed">{post.description}</p>
        {post.budget && (
          <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/30 text-[#00FF87] text-[11px] font-black uppercase tracking-widest">
            {post.budget}
          </div>
        )}
      </div>

      {/* Mídias */}
      {post.media.length > 0 && (
        <div
          className={`grid gap-2 ${
            post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {post.media.slice(0, 4).map((m, i) => (
            <button
              key={i}
              onClick={() => onOpenMedia(i)}
              className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0A0A0B] aspect-video group"
            >
              {m.type === "video" ? (
                <>
                  {m.poster ? (
                    <img
                      src={m.poster}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#00FF87] text-black flex items-center justify-center shadow-[0_0_15px_rgba(0,255,135,0.5)]">
                      <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={m.url}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Ações */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
        <button
          onClick={onChat}
          className="flex-1 bg-[#00FF87] hover:bg-[#00FF87]/90 text-black font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <MessageSquare className="w-4 h-4" /> Chat Direto
        </button>
        <button
          onClick={onPropose}
          className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <Send className="w-4 h-4 text-[#00FF87]" /> Enviar Proposta
        </button>
        <button
          onClick={onSave}
          aria-pressed={isSaved}
          aria-label={isSaved ? "Remover dos salvos" : "Salvar publicação"}
          className={`p-2.5 rounded-xl border transition-colors ${
            isSaved
              ? "bg-[#00FF87]/10 border-[#00FF87]/40 text-[#00FF87]"
              : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? "fill-[#00FF87]" : ""}`} />
        </button>
      </div>
    </article>
  );
}
