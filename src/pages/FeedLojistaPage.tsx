import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { getCategoryTheme } from "@/lib/category-colors";
import {
  FEED_STATUS_COLOR,
  FEED_STATUS_LABEL,
  STATUS_FILTERS,
  getFeedStatus,
  type StatusFilterKey,
} from "@/lib/feed-status";
import { FeedDetailsModal, type FeedDetailsData } from "@/components/FeedDetailsModal";
import { CurrencyInputBRL } from "@/components/CurrencyInputBRL";
import { assertCurrencyIntegrity, parseCurrencyBRL } from "@/lib/currency-brl";

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
  {
    id: "p9",
    category: "cliente",
    author: { id: "u-fernanda", name: "Fernanda Ribeiro", avatarInitials: "FR" },
    rating: 4.9,
    city: "Sorocaba, SP",
    postedAt: "há 25 min",
    title: "Cozinha Planejada para Apartamento de 68m² — Preciso de Orçamento",
    description:
      "Apartamento novo em Sorocaba, cozinha americana com 4,20m de bancada. Busco lojistas que trabalhem com MDF branco e puxadores em alumínio.",
    budget: "R$ 12.000 – R$ 18.000",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=70&auto=format&fit=crop",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["cozinha", "planejada", "mdf", "sorocaba"],
  },
  {
    id: "p10",
    category: "prestador",
    author: { id: "u-pedro-frete", name: "Pedro Transportes", avatarInitials: "PT" },
    rating: 4.8,
    city: "Votorantim, SP",
    postedAt: "há 3 h",
    specialty: "Fretista com Van Baú 3,5m",
    radiusKm: 120,
    title: "Fretista Dedicado para Móveis Planejados — Van Baú Fechada",
    description:
      "Van baú fechada 3,5m com escada e diárias flexíveis. Atendo lojistas no eixo Sorocaba/Campinas/São Paulo. Cargas seguradas.",
    budget: "R$ 380/diária",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["frete", "van", "transporte", "planejados"],
  },
  {
    id: "p11",
    category: "prestador",
    author: {
      id: "u-julia-montadora",
      name: "Júlia Martins",
      avatarInitials: "JM",
      gold: true,
    },
    rating: 5.0,
    city: "Sorocaba, SP",
    postedAt: "há 4 h",
    specialty: "Montadora Certificada Todeschini",
    radiusKm: 90,
    title: "Montadora Certificada — Todeschini, Italinea e Dellanno",
    description:
      "10 anos montando planejados de alto padrão. Tenho equipe própria de 2 auxiliares. Selo Ouro Fixxer. Fotos do portfólio disponíveis.",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=1200&q=70&auto=format&fit=crop",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["montadora", "todeschini", "italinea", "premium"],
  },
  {
    id: "p12",
    category: "fornecedor",
    author: { id: "u-ferragens", name: "Ferragens Blum Distribuidora", avatarInitials: "FB" },
    rating: 4.7,
    city: "São Paulo, SP",
    postedAt: "há 8 h",
    title: "Corrediças e Dobradiças Blum — Estoque Total e Entrega em 24h",
    description:
      "Distribuidor autorizado Blum. Corrediças Tandem, Movento e dobradiças Clip-Top com preço de fábrica para lojistas cadastrados.",
    budget: "Tabela exclusiva B2B",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["ferragens", "blum", "corrediças", "b2b"],
  },
  {
    id: "p13",
    category: "cliente",
    author: { id: "u-roberto", name: "Roberto Almeida", avatarInitials: "RA" },
    rating: 4.6,
    city: "Itu, SP",
    postedAt: "há 12 h",
    title: "Home Theater Planejado com Painel Ripado e Iluminação LED",
    description:
      "Sala de estar 4,80m x 3,20m. Quero painel ripado escuro com nichos e iluminação LED integrada. Envio referências no chat.",
    budget: "R$ 6.000 – R$ 9.500",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1615873968403-89e068629265?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["home", "theater", "painel", "ripado", "itu"],
  },
  {
    id: "p14",
    category: "lojista",
    author: { id: "u-loja-decor", name: "Decor Ambientes", avatarInitials: "DA" },
    rating: 4.8,
    city: "Campinas, SP",
    postedAt: "há 1 dia",
    title: "Parceria de Cross-Selling — Marcenaria + Tapeçaria",
    description:
      "Estamos abrindo parcerias com tapeçarias e vidraçarias para indicação mútua de clientes. Zero taxa, apenas troca de leads qualificados.",
    budget: "Comissão negociável",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&q=70&auto=format&fit=crop",
      },
    ],
    keywords: ["parceria", "cross", "selling", "marcenaria"],
  },
  // ============ NOVOS MOCKS (adicionados) ============
  {
    id: "p13",
    category: "cliente",
    author: { id: "u-rafaela", name: "Rafaela Nunes", avatarInitials: "RN" },
    rating: 4.7,
    city: "Itu, SP",
    postedAt: "há 18 min",
    title: "Home Office Planejado 2,40m — Preciso de Lojista Local",
    description:
      "Quero uma bancada em L com nichos e gaveteiro para escritório em casa. MDF cinza + puxadores pretos. Aceito visita técnica.",
    budget: "R$ 4.500 – R$ 6.800",
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=1200&q=70&auto=format&fit=crop" },
    ],
    keywords: ["home office", "planejado", "itu"],
  },
  {
    id: "p14",
    category: "cliente",
    author: { id: "u-thiago", name: "Thiago Almeida", avatarInitials: "TA" },
    rating: 4.6,
    city: "Campinas, SP",
    postedAt: "há 55 min",
    title: "Painel de TV Ripado + Rack Suspenso para Sala",
    description:
      "Painel ripado freijó com 3,20m e rack suspenso. Já tenho projeto em PDF, preciso apenas execução e instalação.",
    budget: "R$ 3.200 – R$ 4.800",
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1615873968403-89e068629265?w=1200&q=70&auto=format&fit=crop" },
    ],
    keywords: ["painel", "ripado", "rack", "campinas"],
  },
  {
    id: "p15",
    category: "prestador",
    author: { id: "u-bruno-mont", name: "Bruno Montador Pro", avatarInitials: "BM", gold: true },
    rating: 4.95,
    city: "Sorocaba, SP",
    postedAt: "há 1 h",
    specialty: "Montador Master — Cozinhas & Closets",
    radiusKm: 70,
    title: "Montador Master Disponível esta Semana — Selo Ouro",
    description:
      "Vagas para 3 O.S. de médio/grande porte. Equipe própria com 2 auxiliares, ferramenta completa e seguro incluso.",
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=70&auto=format&fit=crop" },
    ],
    keywords: ["montador", "selo ouro", "sorocaba"],
  },
  {
    id: "p16",
    category: "prestador",
    author: { id: "u-lucia-proj", name: "Lúcia Interiores 3D", avatarInitials: "LI" },
    rating: 4.8,
    city: "Jundiaí, SP",
    postedAt: "há 3 h",
    specialty: "Projetista Promob + Render Corona",
    radiusKm: 100,
    title: "Projetos Executivos em 72h com Render Foto-Realista",
    description:
      "Atendo lojistas com pacote fechado por ambiente. Entrega inclui memorial, lista de corte e 4 imagens em alta.",
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=70&auto=format&fit=crop" },
    ],
    keywords: ["projetista", "promob", "render"],
  },
  {
    id: "p17",
    category: "fornecedor",
    author: { id: "u-mdf-master", name: "MDF Master Distribuidora", avatarInitials: "MM" },
    rating: 4.9,
    city: "Campinas, SP",
    postedAt: "há 4 h",
    title: "Chapas MDF Duratex 15/18mm — Entrega em 24h para Lojistas",
    description:
      "Estoque completo em MDF branco TX, freijó, carvalho munique e cinza cristal. Frete grátis acima de 20 chapas.",
    budget: "A partir de R$ 189/chapa",
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=1200&q=70&auto=format&fit=crop" },
    ],
    keywords: ["mdf", "duratex", "chapas", "distribuidor"],
  },
  {
    id: "p18",
    category: "fornecedor",
    author: { id: "u-ferragens-blum", name: "Blum Center Sorocaba", avatarInitials: "BC" },
    rating: 4.8,
    city: "Sorocaba, SP",
    postedAt: "há 6 h",
    title: "Ferragens Blum Originais — Corrediças, Dobradiças e Aventos",
    description:
      "Distribuidor oficial Blum. Kits promocionais para lojistas cadastrados. Consultoria técnica gratuita para projetos.",
    budget: "Descontos progressivos",
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=1200&q=70&auto=format&fit=crop" },
    ],
    keywords: ["blum", "ferragens", "corrediças"],
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

const PAGE_SIZE = 4;
const SAVES_STORAGE_KEY = "fixxer_feed_saves_v1";

const AUTHOR_ROUTE: Record<FeedCategory, string> = {
  lojista: "/lojista",
  prestador: "/prestador",
  fornecedor: "/parceiro",
  cliente: "/cliente",
};

function authorHref(post: FeedPost) {
  return `${AUTHOR_ROUTE[post.category]}/${post.author.id}`;
}


export default function FeedLojistaPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"todos" | FeedCategory>("todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("todos");
  const [detailsFor, setDetailsFor] = useState<FeedPost | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [savesLoaded, setSavesLoaded] = useState(false);
  const [savesRemote, setSavesRemote] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ post: FeedPost; index: number } | null>(null);
  const [proposalFor, setProposalFor] = useState<FeedPost | null>(null);
  const [reportFor, setReportFor] = useState<FeedPost | null>(null);
  const [deleteFor, setDeleteFor] = useState<FeedPost | null>(null);
  const [proposalValue, setProposalValue] = useState("");
  const [proposalMsg, setProposalMsg] = useState("");
  const [proposalError, setProposalError] = useState<string | null>(null);

  // Paginação por scroll infinito
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce da busca — evita filtrar a cada tecla e mostra "buscando..."
  useEffect(() => {
    setSearching(true);
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setSearching(false);
    }, 220);
    return () => clearTimeout(t);
  }, [search]);

  // Carregar favoritos: primeiro do localStorage (instantâneo),
  // depois sincronizar com Supabase se logado + tabela existir.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVES_STORAGE_KEY);
      if (raw) setSaved(new Set(JSON.parse(raw)));
    } catch {}
    setSavesLoaded(true);

    (async () => {
      try {
        const { data: { user } } = await supabaseExternal.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        const { data, error } = await supabaseExternal
          .from("feed_post_saves")
          .select("post_id")
          .eq("user_id", user.id);
        if (error) {
          // Tabela não existe: mantém localStorage como fallback silencioso.
          console.warn("[feed] feed_post_saves indisponível, usando localStorage.", error.message);
          return;
        }
        setSavesRemote(true);
        const remote = new Set<string>((data || []).map((r: any) => r.post_id));
        // Merge local + remoto e reconcilia no servidor.
        const local = new Set(saved);
        const missing = [...local].filter((id) => !remote.has(id));
        if (missing.length > 0) {
          await supabaseExternal
            .from("feed_post_saves")
            .upsert(missing.map((post_id) => ({ user_id: user.id, post_id })), {
              onConflict: "user_id,post_id",
            });
          missing.forEach((id) => remote.add(id));
        }
        setSaved(remote);
        localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify([...remote]));
      } catch (err) {
        console.warn("[feed] falha ao sincronizar favoritos:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persiste local sempre que muda
  useEffect(() => {
    if (!savesLoaded) return;
    try {
      localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify([...saved]));
    } catch {}
  }, [saved, savesLoaded]);

  const visible = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const byCategory = MOCK_POSTS.filter((p) => filter === "todos" || p.category === filter);
    const byStatus = statusFilter === "todos"
      ? byCategory
      : byCategory.filter((p) => getFeedStatus(p.id) === statusFilter);
    const filtered = q
      ? byStatus.filter((p) => {
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
      : byStatus;
    return [...filtered].sort((a, b) => {
      if (a.category === "cliente" && b.category !== "cliente") return -1;
      if (b.category === "cliente" && a.category !== "cliente") return 1;
      return 0;
    });
  }, [filter, statusFilter, debouncedSearch]);

  const paged = useMemo(() => visible.slice(0, page * PAGE_SIZE), [visible, page]);
  const hasMore = paged.length < visible.length;

  // Reset da paginação quando filtro/busca muda
  useEffect(() => {
    setPage(1);
  }, [filter, statusFilter, debouncedSearch]);

  // IntersectionObserver para scroll infinito
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loadingMore) {
          setLoadingMore(true);
          // Pequeno delay para simular carga em rede e evitar flicker
          setTimeout(() => {
            setPage((p) => p + 1);
            setLoadingMore(false);
          }, 350);
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, paged.length]);

  const persistSave = useCallback(
    async (postId: string, nextSaved: boolean) => {
      if (!userId || !savesRemote) return;
      try {
        if (nextSaved) {
          await supabaseExternal
            .from("feed_post_saves")
            .upsert({ user_id: userId, post_id: postId }, { onConflict: "user_id,post_id" });
        } else {
          await supabaseExternal
            .from("feed_post_saves")
            .delete()
            .eq("user_id", userId)
            .eq("post_id", postId);
        }
      } catch (err) {
        console.warn("[feed] falha ao persistir favorito:", err);
      }
    },
    [userId, savesRemote],
  );

  const toggleSaved = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      const willSave = !next.has(id);
      if (willSave) {
        next.add(id);
        toast.success("Publicação salva", {
          description: savesRemote ? "Disponível em qualquer dispositivo." : "Faça login para sincronizar entre dispositivos.",
        });
      } else {
        next.delete(id);
        toast("Publicação removida dos salvos");
      }
      persistSave(id, willSave);
      return next;
    });
  };

  const openChat = (post: FeedPost) => {
    // Abre a conversa direta com o autor (cria-a on-demand ao enviar a 1ª mensagem)
    navigate({ to: "/chat/$peerId", params: { peerId: post.author.id } });
  };

  const submitProposal = () => {
    const err = assertCurrencyIntegrity("Valor da proposta", proposalValue, {
      required: true,
      min: 0.01,
    });
    if (err) {
      setProposalError(err);
      toast.error(err);
      return;
    }
    const n = parseCurrencyBRL(proposalValue);
    toast.success("Proposta enviada!", {
      description: `${proposalFor?.author.name} receberá sua oferta de R$ ${n
        .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
    });
    setProposalFor(null);
    setProposalValue("");
    setProposalMsg("");
    setProposalError(null);
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
              className="w-full bg-[#1A1A1B] border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#00E5FF]"
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
                    ? "bg-[#00E5FF] text-black shadow-[0_0_12px_rgba(0,229,255,0.35)]"
                    : "bg-[#1A1A1B] text-white/60 border border-white/10 hover:text-white"
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Filtros por Status */}
        <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto pt-2 pb-0.5 scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-black shrink-0 mr-1">
            Status:
          </span>
          {STATUS_FILTERS.map((s) => {
            const active = statusFilter === s.key;
            const color = s.key === "todos" ? "#00E5FF" : FEED_STATUS_COLOR[s.key];
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase whitespace-nowrap tracking-wide border transition-all"
                style={
                  active
                    ? { backgroundColor: color, color: "#0A0A0B", borderColor: color, boxShadow: `0 0 10px ${color}55` }
                    : { backgroundColor: "#1A1A1B", color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.1)" }
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Feed com coluna lateral fixa (desktop) */}
      <div className="w-full flex-1 lg:max-w-6xl lg:mx-auto lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6 lg:px-4">
        <aside className="hidden lg:block">
          <div className="sticky top-[168px] space-y-3">
            <div className="p-4 rounded-2xl bg-[#1A1A1B] border border-white/10">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF] mb-3">
                Atalhos do Lojista
              </div>
              <nav className="space-y-1.5">
                <Link to="/lojista" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                  <Store className="w-4 h-4 text-[#00E5FF]" /> Dashboard
                </Link>
                <Link to="/chat" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                  <MessageSquare className="w-4 h-4 text-[#00E5FF]" /> Chat
                </Link>
                <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                  <User className="w-4 h-4 text-[#00E5FF]" /> Meu Perfil
                </Link>
              </nav>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00E5FF]/10 to-transparent border border-[#00E5FF]/20">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF] mb-2">
                Dica Rápida
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Filtre por status para acompanhar propostas, andamentos e finalizações em tempo real.
              </p>
            </div>
          </div>
        </aside>

      <main className="max-w-3xl mx-auto w-full p-3 sm:p-4 space-y-4 flex-1 lg:mx-0 lg:max-w-none">
        {searching ? (
          <div className="space-y-4" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-4 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 bg-white/5 rounded" />
                    <div className="h-2 w-1/4 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="h-3 w-3/4 bg-white/5 rounded mb-2" />
                <div className="h-2 w-full bg-white/5 rounded mb-1" />
                <div className="h-2 w-5/6 bg-white/5 rounded" />
                <div className="h-40 w-full bg-white/5 rounded-2xl mt-3" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-10 text-center">
            <Search className="w-10 h-10 mx-auto mb-3 text-white/30" />
            <h3 className="font-black uppercase italic text-base mb-1">Nada encontrado</h3>
            <p className="text-xs text-white/50 mb-4">
              {debouncedSearch
                ? `Nenhuma publicação para "${debouncedSearch}"${filter !== "todos" ? ` nesta categoria` : ""}.`
                : "Tente outro termo ou remova os filtros para ver todas as publicações."}
            </p>
            {(debouncedSearch || filter !== "todos") && (
              <button
                onClick={() => { setSearch(""); setFilter("todos"); }}
                className="text-[11px] font-bold uppercase tracking-wide px-4 py-2 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 text-white"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {paged.map((post) => (
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
                onOpenDetails={() => setDetailsFor(post)}
              />
            ))}

            {hasMore ? (
              <div
                ref={sentinelRef}
                className="py-6 flex items-center justify-center text-white/50 text-[11px] font-bold uppercase tracking-wide"
              >
                <div className="w-4 h-4 border-2 border-white/20 border-t-[#00E5FF] rounded-full animate-spin mr-2" />
                Carregando mais publicações...
              </div>
            ) : (
              <div className="py-6 text-center text-[11px] font-bold uppercase tracking-wide text-white/30">
                — Fim do feed —
              </div>
            )}
          </>
        )}

      </main>
      </div>

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
            <span className="text-[#00E5FF]">{proposalFor.title}</span>
          </p>
          <div className="mb-3">
            <CurrencyInputBRL
              label="Valor da proposta"
              value={proposalValue}
              onChange={(v) => {
                setProposalValue(v);
                if (proposalError) setProposalError(null);
              }}
              error={proposalError}
              accentColor="#00E5FF"
              placeholder="0,00"
            />
          </div>
          <label className="block text-[10px] uppercase tracking-widest font-black text-white/60 mb-1">
            Mensagem (opcional)
          </label>
          <textarea
            value={proposalMsg}
            onChange={(e) => setProposalMsg(e.target.value)}
            rows={3}
            placeholder="Prazo, condições, escopo..."
            className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#00E5FF] resize-none mb-4"
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
              className="flex-1 py-2.5 rounded-xl bg-[#00E5FF] text-black text-xs font-black uppercase shadow-[0_0_12px_rgba(0,229,255,0.35)]"
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
      {/* Modal de Detalhes do Post */}
      <FeedDetailsModal
        data={
          detailsFor
            ? ({
                id: detailsFor.id,
                title: detailsFor.title,
                description: detailsFor.description,
                category: detailsFor.category,
                status: getFeedStatus(detailsFor.id),
                author: {
                  id: detailsFor.author.id,
                  name: detailsFor.author.name,
                  initials: detailsFor.author.avatarInitials,
                },
                authorHref: authorHref(detailsFor),
                city: detailsFor.city,
                postedAt: detailsFor.postedAt,
                rating: detailsFor.rating,
                badges: [
                  categoryBadge(detailsFor.category).label,
                  ...(detailsFor.specialty ? [detailsFor.specialty] : []),
                  ...(detailsFor.radiusKm ? [`Raio ${detailsFor.radiusKm} km`] : []),
                ],
                metaRows: [
                  ...(detailsFor.budget ? [{ label: "Orçamento", value: detailsFor.budget }] : []),
                  { label: "Publicado", value: detailsFor.postedAt },
                  { label: "Local", value: detailsFor.city },
                ],
                media: detailsFor.media,
                ctaLabel: "Entrar em contato",
              } satisfies FeedDetailsData)
            : null
        }
        isSaved={detailsFor ? saved.has(detailsFor.id) : false}
        onSave={() => detailsFor && toggleSaved(detailsFor.id)}
        onChat={() => {
          if (detailsFor) {
            const p = detailsFor;
            setDetailsFor(null);
            openChat(p);
          }
        }}
        onClose={() => setDetailsFor(null)}
      />
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
  onOpenDetails,
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
  onOpenDetails: () => void;
}) {
  const badge = categoryBadge(post.category);
  const theme = getCategoryTheme(post.category);
  const isClient = post.category === "cliente";
  const status = getFeedStatus(post.id);
  const statusColor = FEED_STATUS_COLOR[status];
  const profileHref = authorHref(post);

  return (
    <article
      className="relative bg-[#1A1A1B] rounded-3xl p-4 sm:p-5 space-y-4 transition-all border-2"
      style={{ ...theme.borderStrong, ...theme.glow }}
    >
      {/* Badges de status + highlight */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border"
          style={{
            color: statusColor,
            borderColor: `${statusColor}55`,
            backgroundColor: `${statusColor}18`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
          {FEED_STATUS_LABEL[status]}
        </span>
        {theme.highlight && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest"
            style={{ ...theme.bgSoft, ...theme.color, ...theme.borderSoft }}
          >
            <Flame className="w-3.5 h-3.5 animate-pulse" />
            {theme.highlight}
          </div>
        )}
      </div>

      {/* Cabeçalho */}
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <Link
          to={profileHref}
          className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center font-black text-sm bg-[#0A0A0B] border hover:scale-105 transition-transform"
          style={{ ...theme.borderStrong, ...theme.color }}
          aria-label={`Ver perfil de ${post.author.name}`}
        >
          {post.author.avatarInitials}
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              to={profileHref}
              className="font-bold text-white text-sm truncate hover:opacity-80"
            >
              {post.author.name}
            </Link>
            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold border"
              style={{ ...theme.bgSoft, ...theme.color, ...theme.borderSoft }}
            >
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
            <span className="font-bold flex items-center gap-1" style={theme.color}>
              <Star className="w-3 h-3" style={theme.fill} />
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
                    onClick={() => { onCloseMenu(); onEdit(); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest hover:bg-white/5"
                  >
                    <Edit3 className="w-4 h-4" /> Editar
                  </button>
                  <button
                    onClick={() => { onCloseMenu(); onDelete(); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest text-red-400 hover:bg-red-500/10 border-t border-white/5"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { onCloseMenu(); onReport(); }}
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
        <button
          onClick={onOpenDetails}
          className="text-left w-full"
        >
          <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight leading-snug hover:opacity-80 transition-opacity">
            {post.title}
          </h3>
        </button>
        <p className="text-xs sm:text-[13px] text-white/70 leading-relaxed">{post.description}</p>
        {post.budget && (
          <div
            className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-widest"
            style={{ ...theme.bgSoft, ...theme.color, ...theme.borderSoft }}
          >
            {post.budget}
          </div>
        )}
      </div>

      {/* Mídias */}
      {post.media.length > 0 && (
        <div className={`grid gap-2 ${post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {post.media.slice(0, 4).map((m, i) => (
            <button
              key={i}
              onClick={() => onOpenMedia(i)}
              className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0A0A0B] aspect-video group"
            >
              {m.type === "video" ? (
                <>
                  {m.poster ? (
                    <img src={m.poster} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ ...theme.bgSolid, ...theme.glowStrong }}
                    >
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
          className="flex-1 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
          style={{ ...theme.bgSolid, ...theme.glow }}
        >
          <MessageSquare className="w-4 h-4" /> {isClient ? "Chat Direto" : "Chat"}
        </button>
        <button
          onClick={onPropose}
          className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <Send className="w-4 h-4" style={theme.color} /> Enviar Proposta
        </button>
        <button
          onClick={onSave}
          aria-pressed={isSaved}
          aria-label={isSaved ? "Remover dos salvos" : "Salvar publicação"}
          className="p-2.5 rounded-xl border transition-colors"
          style={
            isSaved
              ? { ...theme.bgSoft, ...theme.borderSoft, ...theme.color }
              : { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
          }
        >
          <Bookmark className="w-4 h-4" style={isSaved ? theme.fill : undefined} />
        </button>
      </div>
    </article>
  );
}
