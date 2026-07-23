import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  FEED_STATUS_COLOR,
  FEED_STATUS_LABEL,
  STATUS_FILTERS,
  getFeedStatus,
  type StatusFilterKey,
} from "@/lib/feed-status";
import { FeedDetailsModal, type FeedDetailsData } from "@/components/FeedDetailsModal";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  MessageSquare,
  Bookmark,
  Star,
  MapPin,
  Clock,
  Package,
  X,
  Building2,
  Truck,
  FileText,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";

// =============================================================================
// TIPOS
// =============================================================================

type Sector =
  | "Marmoria & Pedras"
  | "Vidraçaria & Espelhos"
  | "Ferragens & Insumos"
  | "Iluminação LED"
  | "Softwares & Maquinário";

type B2BStatus = "aberto" | "urgente" | "negociando" | "em_andamento";
type RequesterType = "lojista" | "prestador";

type B2BRequest = {
  id: string;
  store: {
    id: string;
    name: string;
    initials: string;
    verified?: boolean;
  };
  requesterType?: RequesterType;
  city: string;
  state: string;
  rating: number;
  postedAt: string;
  status: B2BStatus;
  sector: Sector;
  title: string;
  description: string;
  specs: string[];
  quantity: string;
  deadline: string;
  paymentTerms: string;
  attachment?: string;
};

type QuoteStatus = "pendente" | "aceita" | "recusada";

const SAVES_STORAGE_KEY = "fixxer_parceiro_saves_v1";

// =============================================================================
// MOCK DATA — DEMANDAS B2B
// =============================================================================

const SECTORS: Array<"Todas as Demandas" | Sector> = [
  "Todas as Demandas",
  "Marmoria & Pedras",
  "Vidraçaria & Espelhos",
  "Ferragens & Insumos",
  "Iluminação LED",
  "Softwares & Maquinário",
];

const MOCK_REQUESTS: B2BRequest[] = [
  {
    id: "b2b-001",
    store: { id: "store-marcenaria-premium", name: "Marcenaria Premium", initials: "MP", verified: true },
    city: "Sorocaba",
    state: "SP",
    rating: 4.9,
    postedAt: "há 2h",
    status: "urgente",
    sector: "Marmoria & Pedras",
    title: "3 Tampos em Quartzo Branco Calacatta — Projeto Alto Padrão",
    description:
      "Busco fornecedor com estoque imediato de quartzo Calacatta importado para 3 tampos de bancada. Necessário acabamento polido e transporte incluso.",
    specs: [
      "Quartzo Calacatta 20mm — polido",
      "Tampo 1: 2.80m x 0.65m",
      "Tampo 2: 2.20m x 0.65m",
      "Tampo 3: 1.60m x 0.55m",
      "Bordas retas + testeira 4cm",
    ],
    quantity: "3 peças",
    deadline: "Entrega em até 12 dias",
    paymentTerms: "30/60 dias — boleto",
    attachment:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "b2b-002",
    store: { id: "store-inovamad", name: "Lojas Inovamad", initials: "LI", verified: true },
    city: "Votorantim",
    state: "SP",
    rating: 4.7,
    postedAt: "há 5h",
    status: "aberto",
    sector: "Vidraçaria & Espelhos",
    title: "Espelhos Bronze com Bisotê + Portas de Alumínio p/ Guarda-Roupas",
    description:
      "Demanda recorrente mensal. Preciso de parceiro com capacidade de entrega semanal em Votorantim e região.",
    specs: [
      "Espelho Bronze 4mm com bisotê 2cm",
      "12 peças 1.80m x 0.60m",
      "Perfil de alumínio anodizado fosco",
      "Roldanas suaves — trilho embutido",
    ],
    quantity: "12 conjuntos/mês",
    deadline: "Primeira remessa em 8 dias",
    paymentTerms: "À vista 5% desc. ou 28 dias",
    attachment:
      "https://images.unsplash.com/photo-1616627547584-bf28cee262db?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "b2b-003",
    store: { id: "store-ferragens-norte", name: "Ferragens Norte Design", initials: "FN" },
    city: "Curitiba",
    state: "PR",
    rating: 4.5,
    postedAt: "há 1 dia",
    status: "aberto",
    sector: "Ferragens & Insumos",
    title: "Lote Mensal de Corrediças Telescópicas Soft-Close",
    description:
      "Parceria recorrente para abastecimento mensal de corrediças e dobradiças caneco 35mm de qualidade premium.",
    specs: [
      "Corrediça telescópica 45cm — 200 pares/mês",
      "Corrediça telescópica 50cm — 150 pares/mês",
      "Dobradiça caneco 35mm reta — 800 un.",
      "Amortecedor hidráulico integrado",
    ],
    quantity: "Contrato 6 meses",
    deadline: "Entregas mensais até dia 5",
    paymentTerms: "45 dias fora mês",
  },
  {
    id: "b2b-004",
    store: { id: "store-studio-iluminar", name: "Studio Iluminar", initials: "SI", verified: true },
    city: "São Paulo",
    state: "SP",
    rating: 4.8,
    postedAt: "há 1 dia",
    status: "negociando",
    sector: "Iluminação LED",
    title: "Fitas LED COB 24V + Perfil Alumínio Embutir",
    description:
      "Projeto residencial de alto padrão. Preciso fitas COB alta densidade sem pontos de luz visíveis + perfis compatíveis.",
    specs: [
      "Fita LED COB 24V 3000K — 60 metros",
      "Fita LED COB 24V 4000K — 40 metros",
      "Perfil embutir alumínio — 100m",
      "Difusor leitoso opalino",
      "Fontes 24V/150W — 6 un.",
    ],
    quantity: "100m + acessórios",
    deadline: "Entrega em 7 dias",
    paymentTerms: "50% entrada + 50% entrega",
    attachment:
      "https://images.unsplash.com/photo-1524634126442-357e0eac3c14?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "b2b-005",
    store: { id: "store-fabrica-modular", name: "Fábrica Modular Sul", initials: "FS", verified: true },
    city: "Joinville",
    state: "SC",
    rating: 4.6,
    postedAt: "há 2 dias",
    status: "aberto",
    sector: "Softwares & Maquinário",
    title: "Licença Anual Software CAM + Bits para Router CNC",
    description:
      "Preciso renovar licença anual do software de nesting e adquirir kit de bits compactos para nossa CNC de 3 eixos.",
    specs: [
      "Licença CAM anual — 2 estações",
      "Bit compactado 3.175mm — 20 un.",
      "Bit downcut 6mm — 15 un.",
      "Fresa 90° V-groove — 5 un.",
      "Treinamento remoto incluso",
    ],
    quantity: "Kit completo + licença",
    deadline: "Envio imediato após pedido",
    paymentTerms: "Boleto 21 dias",
  },
  {
    id: "b2b-006",
    store: { id: "store-marmore-arte", name: "Mármore & Arte", initials: "MA", verified: true },
    city: "Belo Horizonte",
    state: "MG",
    rating: 4.8,
    postedAt: "há 2 dias",
    status: "aberto",
    sector: "Marmoria & Pedras",
    title: "Placas de Granito Preto São Gabriel — Escadaria",
    description:
      "Fornecimento de placas polidas para escadaria interna. Necessário rodapé e acabamento anti-derrapante nos degraus.",
    specs: [
      "Granito Preto São Gabriel 20mm",
      "22 degraus 1.20m x 0.30m",
      "22 espelhos 1.20m x 0.18m",
      "Acabamento flameado nos degraus",
    ],
    quantity: "22 conjuntos",
    deadline: "Entrega em 15 dias",
    paymentTerms: "40% entrada + 60% entrega",
  },
  {
    id: "b2b-007",
    store: { id: "store-vidros-central", name: "Vidros Central", initials: "VC" },
    city: "Campinas",
    state: "SP",
    rating: 4.4,
    postedAt: "há 3 dias",
    status: "aberto",
    sector: "Vidraçaria & Espelhos",
    title: "Vidros Temperados 10mm para Boxes de Banheiro",
    description:
      "Contrato recorrente para vidraçaria que atende construtoras. Precisamos de parceiro com corte digital e entrega semanal.",
    specs: [
      "Vidro temperado incolor 10mm",
      "Corte digital com CNC",
      "Furações padrão para ferragens",
      "Entrega semanal — 40 peças",
    ],
    quantity: "40 peças/semana",
    deadline: "Início imediato",
    paymentTerms: "30 dias — boleto",
    attachment:
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "b2b-008",
    store: { id: "store-hardware-plus", name: "Hardware Plus", initials: "HP", verified: true },
    city: "Porto Alegre",
    state: "RS",
    rating: 4.7,
    postedAt: "há 3 dias",
    status: "negociando",
    sector: "Ferragens & Insumos",
    title: "Puxadores em Alumínio Escovado — Linha Premium",
    description:
      "Reposição mensal para nossa vitrine premium. Priorizo fornecedores com catálogo próprio e MOQ flexível.",
    specs: [
      "Puxador tubular 128mm — 300 un.",
      "Puxador tubular 192mm — 200 un.",
      "Puxador cava embutida 96mm — 400 un.",
      "Acabamento alumínio escovado",
    ],
    quantity: "900 un./mês",
    deadline: "Reposição mensal dia 10",
    paymentTerms: "35 dias — boleto",
  },
  {
    id: "b2b-009",
    store: { id: "store-luz-ambiente", name: "Luz & Ambiente", initials: "LA" },
    city: "Rio de Janeiro",
    state: "RJ",
    rating: 4.6,
    postedAt: "há 4 dias",
    status: "urgente",
    sector: "Iluminação LED",
    title: "Spots Embutidos LED 7W + Trilhos Bifásicos",
    description:
      "Obra corporativa iminente. Necessário estoque imediato e nota fiscal com CST configurado para prefeitura.",
    specs: [
      "Spot embutido LED 7W 4000K — 120 un.",
      "Trilho bifásico 2m preto — 30 un.",
      "Spot para trilho GU10 — 90 un.",
      "IRC ≥ 90",
    ],
    quantity: "240 itens totais",
    deadline: "Entrega em 5 dias",
    paymentTerms: "À vista PIX 3% desc.",
  },
  {
    id: "b2b-010",
    store: { id: "store-cnc-experts", name: "CNC Experts", initials: "CE", verified: true },
    city: "São José dos Campos",
    state: "SP",
    rating: 4.9,
    postedAt: "há 5 dias",
    status: "aberto",
    sector: "Softwares & Maquinário",
    title: "Manutenção Preventiva Router CNC + Kit Fresas",
    description:
      "Contrato anual de manutenção preventiva com peças e insumos inclusos. Também interessados em curso técnico para operadores.",
    specs: [
      "Manutenção trimestral in loco",
      "Kit fresas compactadas 6mm — 30 un.",
      "Substituição de escovas anual",
      "Curso técnico para 3 operadores",
    ],
    quantity: "Contrato anual",
    deadline: "Início em 20 dias",
    paymentTerms: "12x no boleto",
  },
  {
    id: "b2b-011",
    store: { id: "store-glass-design", name: "Glass Design", initials: "GD", verified: true },
    city: "Florianópolis",
    state: "SC",
    rating: 4.7,
    postedAt: "há 6 dias",
    status: "aberto",
    sector: "Vidraçaria & Espelhos",
    title: "Espelhos Extra-Grandes com Moldura em Alumínio",
    description:
      "Projeto de hotelaria — 40 quartos. Precisamos de peças únicas com moldura fina cor champagne e fixação embutida.",
    specs: [
      "Espelho cristal 5mm 1.80m x 0.90m",
      "Moldura alumínio champagne 12mm",
      "Fixação embutida sem visíveis",
      "40 peças idênticas",
    ],
    quantity: "40 peças",
    deadline: "Entrega em 30 dias",
    paymentTerms: "50/50 — boleto",
  },
  {
    id: "b2b-012",
    store: { id: "store-marmores-elite", name: "Mármores Elite", initials: "ME" },
    city: "Vitória",
    state: "ES",
    rating: 4.5,
    postedAt: "há 1 semana",
    status: "aberto",
    sector: "Marmoria & Pedras",
    title: "Blocos de Mármore Branco Piguês — Corte sob Medida",
    description:
      "Compra recorrente para revenda. Solicito parceria com marmoraria capaz de fornecer blocos brutos + corte por encomenda.",
    specs: [
      "Mármore Branco Piguês bruto",
      "Blocos 3m x 1.5m x 0.5m",
      "Corte sob medida em pedidos",
      "Contrato de 12 meses",
    ],
    quantity: "8 blocos/mês",
    deadline: "Início em 10 dias",
    paymentTerms: "45 dias fora mês",
  },
  // ============ SERVIÇOS EM ANDAMENTO — LOJISTAS & PRESTADORES ============
  {
    id: "b2b-013",
    store: { id: "store-planejados-sorocaba", name: "Design Planejados Sorocaba", initials: "DP", verified: true },
    requesterType: "lojista",
    city: "Sorocaba", state: "SP", rating: 4.85, postedAt: "há 30 min",
    status: "em_andamento", sector: "Ferragens & Insumos",
    title: "Reposição URGENTE de Corrediças Blum — Obra em Execução",
    description:
      "Obra iniciada na segunda, faltaram 12 pares de corrediças Blum Tandem 55cm. Preciso hoje para não parar a montagem.",
    specs: [
      "Corrediça Blum Tandem 55cm — 12 pares",
      "Push-open integrado",
      "Retirada em Sorocaba ou entrega hoje",
    ],
    quantity: "12 pares",
    deadline: "Entrega hoje até 17h",
    paymentTerms: "PIX à vista",
  },
  {
    id: "b2b-014",
    store: { id: "prest-carlos-conf", name: "Carlos Silva — Conferente Técnico", initials: "CS", verified: true },
    requesterType: "prestador",
    city: "Sorocaba", state: "SP", rating: 4.9, postedAt: "há 1 h",
    status: "em_andamento", sector: "Ferragens & Insumos",
    title: "Kit de Ferragens Complementar — O.S. em Execução (Alphaville)",
    description:
      "Estou executando conferência em Alphaville e identifiquei falta de dobradiças caneco 35mm curvas. Preciso fornecedor com entrega direta na obra amanhã cedo.",
    specs: [
      "Dobradiça caneco 35mm curva — 24 un.",
      "Amortecedor hidráulico Blum — 24 un.",
      "Parafusos 4x16 chip — 200 un.",
      "Entrega direta no canteiro",
    ],
    quantity: "Kit completo",
    deadline: "Entrega amanhã 8h",
    paymentTerms: "Faturado 15 dias (nota do prestador)",
  },
  {
    id: "b2b-015",
    store: { id: "prest-bruno-mont", name: "Bruno Montador Pro", initials: "BM", verified: true },
    requesterType: "prestador",
    city: "Jundiaí", state: "SP", rating: 4.95, postedAt: "há 2 h",
    status: "em_andamento", sector: "Vidraçaria & Espelhos",
    title: "Espelho Bronze 4mm Bisotê — Substituição em Obra Aberta",
    description:
      "Estou finalizando montagem de closet e o espelho chegou com defeito de fábrica. Preciso reposição rápida com corte já feito.",
    specs: [
      "Espelho Bronze 4mm 1.80m x 0.60m — 1 peça",
      "Bisotê 2cm nas 4 bordas",
      "Furação para roldana Blum",
    ],
    quantity: "1 peça",
    deadline: "Entrega em 48h",
    paymentTerms: "PIX na entrega",
    attachment:
      "https://images.unsplash.com/photo-1616627547584-bf28cee262db?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "b2b-016",
    store: { id: "prest-ana-proj", name: "Ana Projetos — Projetista 3D", initials: "AP", verified: true },
    requesterType: "prestador",
    city: "Itu", state: "SP", rating: 4.8, postedAt: "há 4 h",
    status: "em_andamento", sector: "Softwares & Maquinário",
    title: "Licença Adicional Promob — Projeto em Curso para Lojista",
    description:
      "Assumi 3 projetos executivos para uma marcenaria de Itu e preciso de uma estação Promob extra por 30 dias para paralelizar entregas.",
    specs: [
      "Licença Promob Plus — 30 dias",
      "Biblioteca de ferragens Blum atualizada",
      "Suporte técnico dedicado",
    ],
    quantity: "1 licença mensal",
    deadline: "Ativação imediata",
    paymentTerms: "Cartão em 3x sem juros",
  },
  {
    id: "b2b-017",
    store: { id: "prest-lucia-3d", name: "Lúcia Interiores 3D", initials: "LI", verified: true },
    requesterType: "prestador",
    city: "Sorocaba", state: "SP", rating: 4.85, postedAt: "há 6 h",
    status: "em_andamento", sector: "Iluminação LED",
    title: "Fita LED COB p/ Nichos — Projeto em Instalação Final",
    description:
      "Finalizando instalação de home theater. Cliente pediu upgrade de iluminação nos nichos: fita COB alta densidade + fonte compatível.",
    specs: [
      "Fita LED COB 24V 3000K — 8 metros",
      "Fonte 24V 60W — 1 un.",
      "Perfil embutir alumínio — 8m",
      "Difusor opalino",
    ],
    quantity: "Kit iluminação nichos",
    deadline: "Retirada em 3 dias",
    paymentTerms: "PIX à vista 5% desc.",
  },
  {
    id: "b2b-018",
    store: { id: "prest-pedro-inst", name: "Pedro Transportes & Instalações", initials: "PT" },
    requesterType: "prestador",
    city: "Campinas", state: "SP", rating: 4.7, postedAt: "há 12 h",
    status: "em_andamento", sector: "Ferragens & Insumos",
    title: "Puxadores Alumínio Escovado — Complemento para O.S. Ativa",
    description:
      "Cliente final aprovou troca de puxadores durante montagem. Preciso 18 unidades 128mm alumínio escovado com entrega até amanhã.",
    specs: [
      "Puxador tubular 128mm — 18 un.",
      "Acabamento alumínio escovado",
      "Fixação inclusa",
    ],
    quantity: "18 un.",
    deadline: "Entrega amanhã",
    paymentTerms: "Boleto 7 dias",
  },
];

const PAGE_SIZE = 4;

// =============================================================================
// PÁGINA
// =============================================================================

export default function FeedParceiroPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeSector, setActiveSector] = useState<(typeof SECTORS)[number]>(
    "Todas as Demandas",
  );
  const [saved, setSaved] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(SAVES_STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const [savesRemote, setSavesRemote] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [quotesByRequest, setQuotesByRequest] = useState<Record<string, QuoteStatus>>({});
  const [quotesRemote, setQuotesRemote] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState<B2BRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("todos");
  const [detailsFor, setDetailsFor] = useState<B2BRequest | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Persistência local imediata dos favoritos
  useEffect(() => {
    try {
      window.localStorage.setItem(
        SAVES_STORAGE_KEY,
        JSON.stringify(Array.from(saved)),
      );
    } catch {
      /* ignore */
    }
  }, [saved]);

  // Sincronizar com Supabase (favoritos + cotações)
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabaseExternal.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        // Favoritos
        const { data: savesData, error: savesErr } = await supabaseExternal
          .from("feed_post_saves")
          .select("post_id")
          .eq("user_id", user.id);
        if (!savesErr && savesData) {
          setSavesRemote(true);
          const remote = new Set<string>(savesData.map((r: { post_id: string }) => r.post_id));
          setSaved((prev) => {
            const missing = [...prev].filter((id) => !remote.has(id));
            if (missing.length > 0) {
              void supabaseExternal
                .from("feed_post_saves")
                .upsert(
                  missing.map((post_id) => ({ user_id: user.id, post_id })),
                  { onConflict: "user_id,post_id" },
                );
            }
            return new Set([...prev, ...remote]);
          });
        } else if (savesErr) {
          console.warn("[feed] feed_post_saves indisponível:", savesErr.message);
        }

        // Cotações B2B enviadas
        const { data: quotesData, error: quotesErr } = await supabaseExternal
          .from("b2b_quotes")
          .select("request_id,status")
          .eq("supplier_id", user.id);
        if (!quotesErr && quotesData) {
          setQuotesRemote(true);
          const map: Record<string, QuoteStatus> = {};
          for (const q of quotesData as Array<{ request_id: string; status: QuoteStatus }>) {
            map[q.request_id] = q.status ?? "pendente";
          }
          setQuotesByRequest(map);
        } else if (quotesErr) {
          console.warn("[feed] b2b_quotes indisponível:", quotesErr.message);
        }
      } catch (err) {
        console.warn("[feed] falha ao sincronizar dados B2B:", err);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return MOCK_REQUESTS.filter((r) => {
      if (activeSector !== "Todas as Demandas" && r.sector !== activeSector)
        return false;
      if (statusFilter !== "todos" && getFeedStatus(r.id) !== statusFilter) return false;
      if (!term) return true;
      return (
        r.title.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.store.name.toLowerCase().includes(term) ||
        r.city.toLowerCase().includes(term) ||
        r.state.toLowerCase().includes(term)
      );
    });
  }, [search, activeSector, statusFilter]);

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = paged.length < filtered.length;

  useEffect(() => {
    setPage(1);
  }, [search, activeSector]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          setTimeout(() => {
            setPage((p) => p + 1);
            setLoadingMore(false);
          }, 350);
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore]);

  const persistSave = useCallback(
    async (postId: string, willSave: boolean) => {
      if (!userId || !savesRemote) return;
      try {
        if (willSave) {
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
        toast.success("Oportunidade salva no seu mural", {
          description: savesRemote
            ? "Disponível em qualquer dispositivo."
            : "Faça login para sincronizar entre dispositivos.",
        });
      } else {
        next.delete(id);
        toast("Oportunidade removida dos salvos");
      }
      void persistSave(id, willSave);
      return next;
    });
  };

  const openChat = (r: B2BRequest) => {
    const peerId = r.store.id;
    if (!peerId) {
      toast.error("Loja sem canal B2B disponível.");
      return;
    }
    toast(`Abrindo canal B2B com ${r.store.name}...`);
    navigate({ to: "/chat/$peerId", params: { peerId } }).catch(() => {
      navigate({ to: "/chat" }).catch(() => undefined);
    });
  };

  const handleQuoteSubmit = async (
    request: B2BRequest,
    payload: { price: string; payment: string; delivery: string; notes: string },
  ) => {
    // Otimista
    setQuotesByRequest((prev) => ({ ...prev, [request.id]: "pendente" }));

    try {
      const {
        data: { user },
      } = await supabaseExternal.auth.getUser();
      if (!user) {
        toast.warning("Cotação registrada localmente", {
          description: "Faça login para enviar ao lojista.",
        });
        return;
      }
      const row = {
        supplier_id: user.id,
        request_id: request.id,
        store_id: request.store.id,
        price: payload.price,
        payment_terms: payload.payment,
        delivery_terms: payload.delivery,
        notes: payload.notes || null,
        status: "pendente" as QuoteStatus,
      };
      const { error } = await supabaseExternal
        .from("b2b_quotes")
        .upsert(row, { onConflict: "supplier_id,request_id" });
      if (error) {
        console.warn("[feed] b2b_quotes indisponível:", error.message);
        toast.warning("Cotação registrada localmente", {
          description: "Sincronização com o banco pendente.",
        });
      } else {
        setQuotesRemote(true);
        toast.success(`Cotação enviada para ${request.store.name}`);
      }
    } catch (err) {
      console.warn("[feed] falha ao enviar cotação:", err);
      toast.error("Não foi possível enviar a cotação agora.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white pb-32">
      {/* HEADER FIXO */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0A0B]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() =>
              navigate({ to: "/dashboard/parceiro" }).catch(() => undefined)
            }
            className="rounded-full border border-white/10 bg-[#1A1A1B] p-2 text-white/80 transition hover:border-[#A855F7]/40 hover:text-[#A855F7]"
            aria-label="Voltar para Dashboard do Fornecedor"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-[#1A1A1B] px-3 py-2">
            <Search className="h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por material, loja ou cidade..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
            />
          </div>
        </div>
        {/* PÍLULAS DE SETOR */}
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3">
          {SECTORS.map((s) => {
            const active = s === activeSector;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setActiveSector(s)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-[#A855F7] bg-[#A855F7]/10 text-[#A855F7] shadow-[0_0_16px_rgba(168,85,247,0.25)]"
                    : "border-white/10 bg-[#1A1A1B] text-white/70 hover:border-white/20"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-black shrink-0">
            Status:
          </span>
          {STATUS_FILTERS.map((s) => {
            const active = statusFilter === s.key;
            const color = s.key === "todos" ? "#A855F7" : FEED_STATUS_COLOR[s.key];
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap tracking-widest border transition-all"
                style={
                  active
                    ? { backgroundColor: color, color: "#0A0A0B", borderColor: color, boxShadow: `0 0 10px ${color}55` }
                    : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.1)" }
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* FEED */}
      <main className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-4 flex items-center justify-between text-xs text-white/50">
          <span>
            {filtered.length} demanda{filtered.length === 1 ? "" : "s"} B2B
          </span>
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-[#A855F7]" />
            Feed do Fornecedor
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#1A1A1B] p-8 text-center text-sm text-white/60">
            Nenhuma demanda encontrada para os filtros atuais.
          </div>
        ) : (
          <ul className="space-y-4">
            {paged.map((r) => {
              const quoteStatus = quotesByRequest[r.id];
              const isPrestador = r.requesterType === "prestador";
              const accent = isPrestador ? "#FF9F0A" : "#00E5FF";
              const accentRgba = (a: number) => isPrestador
                ? `rgba(255, 159, 10, ${a})`
                : `rgba(0, 229, 255, ${a})`;
              const roleLabel = isPrestador ? "✓ Prestador" : "✓ Lojista";
              return (
                <li
                  key={r.id}
                  className="overflow-hidden rounded-2xl border-2 bg-[#1A1A1B]"
                  style={{ borderColor: accentRgba(0.35), boxShadow: `0 0 18px ${accentRgba(0.1)}` }}
                >
                  {/* Cabeçalho */}
                  <div className="flex items-start gap-3 p-4">
                    <Link
                      to={isPrestador ? "/prestador/$id" : "/lojista/$id"}
                      params={{ id: r.store.id }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-[#0A0A0B] text-sm font-semibold hover:scale-105 transition-transform"
                      style={{ borderColor: accent, color: accent }}
                    >
                      {r.store.initials}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-semibold flex-wrap">
                        <Link
                          to={isPrestador ? "/prestador/$id" : "/lojista/$id"}
                          params={{ id: r.store.id }}
                          className="truncate hover:opacity-80"
                        >
                          {r.store.name}
                        </Link>
                        {r.store.verified && (
                          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: accentRgba(0.15), color: accent }}>
                            {roleLabel}
                          </span>
                        )}
                        {(() => {
                          const st = getFeedStatus(r.id);
                          const c = FEED_STATUS_COLOR[st];
                          return (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border"
                              style={{ color: c, borderColor: `${c}55`, backgroundColor: `${c}18` }}
                            >
                              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: c }} />
                              {FEED_STATUS_LABEL[st]}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/50">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.city}/{r.state}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {r.rating.toFixed(1)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {r.postedAt}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  {/* Título + descrição */}
                  <div className="px-4 pb-3">
                    <button type="button" onClick={() => setDetailsFor(r)} className="text-left w-full">
                      <h3 className="text-base font-semibold leading-snug hover:opacity-80 transition-opacity">
                        {r.title}
                      </h3>
                    </button>
                    <p className="mt-1 text-sm text-white/70">{r.description}</p>
                  </div>

                  {/* Anexo/desenho técnico */}
                  {r.attachment && (
                    <button
                      type="button"
                      onClick={() => setLightbox(r.attachment!)}
                      className="group relative block w-full overflow-hidden border-y border-white/10 bg-black"
                    >
                      <img
                        src={r.attachment}
                        alt="Anexo técnico"
                        loading="lazy"
                        className="h-56 w-full object-cover transition group-hover:opacity-90"
                      />
                      <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white/80">
                        Ver ampliado
                      </span>
                    </button>
                  )}

                  {/* Especificações */}
                  <div className="border-t border-white/5 px-4 py-3">
                    <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#A855F7]">
                      <FileText className="h-3.5 w-3.5" />
                      Especificações
                    </div>
                    <ul className="space-y-1 text-sm text-white/80">
                      {r.specs.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A855F7]/70" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Meta B2B */}
                  <div className="grid grid-cols-3 gap-2 border-t border-white/5 px-4 py-3 text-[11px]">
                    <MetaCell
                      icon={<Package className="h-3.5 w-3.5" />}
                      label="Quantidade"
                      value={r.quantity}
                    />
                    <MetaCell
                      icon={<Truck className="h-3.5 w-3.5" />}
                      label="Prazo"
                      value={r.deadline}
                    />
                    <MetaCell
                      icon={<DollarSign className="h-3.5 w-3.5" />}
                      label="Pagamento"
                      value={r.paymentTerms}
                    />
                  </div>

                  {/* Status da cotação */}
                  {quoteStatus && (
                    <div className="border-t border-white/5 px-4 py-2">
                      <QuoteStatusPill status={quoteStatus} />
                    </div>
                  )}

                  {/* Barra de ações */}
                  <div className="flex items-center gap-2 border-t border-white/10 bg-[#0F0F10] p-3">
                    <button
                      type="button"
                      onClick={() => setQuoteOpen(r)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                        quoteStatus
                          ? "border border-[#A855F7]/40 bg-[#A855F7]/10 text-[#A855F7] hover:bg-[#A855F7]/15"
                          : "bg-[#A855F7] text-black shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:brightness-110"
                      }`}
                    >
                      {quoteStatus ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Revisar cotação
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4" />
                          Enviar cotação B2B
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openChat(r)}
                      className="rounded-full border border-white/10 bg-[#1A1A1B] p-2.5 text-white/80 transition hover:border-[#A855F7]/40 hover:text-[#A855F7]"
                      aria-label="Chat direto B2B"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSaved(r.id)}
                      className={`rounded-full border p-2.5 transition ${
                        saved.has(r.id)
                          ? "border-[#A855F7]/50 bg-[#A855F7]/10 text-[#A855F7]"
                          : "border-white/10 bg-[#1A1A1B] text-white/80 hover:border-[#A855F7]/40 hover:text-[#A855F7]"
                      }`}
                      aria-label="Salvar oportunidade"
                    >
                      <Bookmark
                        className={`h-4 w-4 ${saved.has(r.id) ? "fill-current" : ""}`}
                      />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Sentinela do scroll infinito */}
        {filtered.length > 0 && (
          <div ref={sentinelRef} className="py-6 text-center">
            {loadingMore && (
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/50">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#A855F7] border-t-transparent" />
                Carregando mais demandas...
              </div>
            )}
            {!hasMore && !loadingMore && (
              <span className="text-[11px] uppercase tracking-widest text-white/40">
                — Fim das demandas —
              </span>
            )}
          </div>
        )}
      </main>

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt="Anexo ampliado"
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        </div>
      )}

      {/* MODAL COTAÇÃO */}
      {quoteOpen && (
        <QuoteModal
          request={quoteOpen}
          existingStatus={quotesByRequest[quoteOpen.id]}
          onClose={() => setQuoteOpen(null)}
          onSubmit={async (payload) => {
            const req = quoteOpen;
            setQuoteOpen(null);
            await handleQuoteSubmit(req, payload);
          }}
        />
      )}

      {/* MODAL DE DETALHES */}
      <FeedDetailsModal
        data={
          detailsFor
            ? ({
                id: detailsFor.id,
                title: detailsFor.title,
                description: detailsFor.description,
                category: "fornecedor",
                status: getFeedStatus(detailsFor.id),
                author: {
                  id: detailsFor.store.id,
                  name: detailsFor.store.name,
                  initials: detailsFor.store.initials,
                },
                authorHref:
                  detailsFor.requesterType === "prestador"
                    ? `/prestador/${detailsFor.store.id}`
                    : `/lojista/${detailsFor.store.id}`,
                city: `${detailsFor.city}/${detailsFor.state}`,
                postedAt: detailsFor.postedAt,
                rating: detailsFor.rating,
                badges: [detailsFor.sector],
                metaRows: [
                  { label: "Setor", value: detailsFor.sector },
                  { label: "Local", value: `${detailsFor.city}/${detailsFor.state}` },
                  { label: "Publicado", value: detailsFor.postedAt },
                ],
                media: detailsFor.attachment
                  ? [{ type: "image" as const, url: detailsFor.attachment }]
                  : [],
                ctaLabel: "Enviar cotação",
              } satisfies FeedDetailsData)
            : null
        }
        isSaved={detailsFor ? saved.has(detailsFor.id) : false}
        onSave={() =>
          detailsFor &&
          setSaved((prev) => {
            const next = new Set(prev);
            if (next.has(detailsFor.id)) next.delete(detailsFor.id);
            else next.add(detailsFor.id);
            return next;
          })
        }
        onChat={() => {
          if (detailsFor) {
            const req = detailsFor;
            setDetailsFor(null);
            setQuoteOpen(req);
          }
        }}
        onClose={() => setDetailsFor(null)}
      />
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

function StatusBadge({ status }: { status: B2BStatus }) {
  const map: Record<B2BStatus, { label: string; className: string }> = {
    aberto: {
      label: "Aberto",
      className: "border-white/15 bg-white/5 text-white/70",
    },
    urgente: {
      label: "Urgente",
      className:
        "border-red-500/40 bg-red-500/10 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.25)]",
    },
    negociando: {
      label: "Negociando",
      className: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    },
    em_andamento: {
      label: "Em Andamento",
      className:
        "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.25)]",
    },
  };
  const s = map[status];
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${s.className}`}
    >
      {s.label}
    </span>
  );
}

function QuoteStatusPill({ status }: { status: QuoteStatus }) {
  const map: Record<QuoteStatus, { label: string; className: string }> = {
    pendente: {
      label: "Cotação enviada — aguardando lojista",
      className: "border-[#A855F7]/40 bg-[#A855F7]/10 text-[#A855F7]",
    },
    aceita: {
      label: "Cotação aceita",
      className: "border-emerald-400/50 bg-emerald-400/10 text-emerald-200",
    },
    recusada: {
      label: "Cotação recusada",
      className: "border-red-500/40 bg-red-500/10 text-red-300",
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${s.className}`}
    >
      <CheckCircle2 className="h-3 w-3" />
      {s.label}
    </span>
  );
}

function MetaCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#0F0F10] p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/40">
        {icon}
        {label}
      </div>
      <div className="text-[11px] font-medium leading-tight text-white/90">
        {value}
      </div>
    </div>
  );
}

function QuoteModal({
  request,
  existingStatus,
  onClose,
  onSubmit,
}: {
  request: B2BRequest;
  existingStatus?: QuoteStatus;
  onClose: () => void;
  onSubmit: (payload: {
    price: string;
    payment: string;
    delivery: string;
    notes: string;
  }) => void | Promise<void>;
}) {
  const [price, setPrice] = useState("");
  const [payment, setPayment] = useState("");
  const [delivery, setDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price.trim() || !payment.trim() || !delivery.trim()) {
      toast.error("Preencha preço, condições e prazo.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ price, payment, delivery, notes });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-white/10 bg-[#1A1A1B] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#A855F7]">
              Cotação B2B
            </div>
            <div className="text-sm font-semibold">{request.store.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/70 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {existingStatus && (
          <div className="border-b border-white/10 bg-[#0F0F10] px-4 py-2 text-[11px] text-white/70">
            Você já possui uma cotação{" "}
            <span className="font-semibold text-[#A855F7]">{existingStatus}</span>{" "}
            para esta demanda. Enviar novamente irá atualizar os valores.
          </div>
        )}
        <form onSubmit={submit} className="space-y-3 p-4">
          <Field
            label="Preço total (R$)"
            value={price}
            onChange={setPrice}
            placeholder="Ex.: 12.480,00"
          />
          <Field
            label="Condições de pagamento"
            value={payment}
            onChange={setPayment}
            placeholder="Ex.: 30/60/90 boleto"
          />
          <Field
            label="Prazo de entrega"
            value={delivery}
            onChange={setDelivery}
            placeholder="Ex.: 10 dias úteis"
          />
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/50">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Detalhes adicionais, garantias, frete..."
              className="w-full rounded-lg border border-white/10 bg-[#0F0F10] px-3 py-2 text-sm outline-none focus:border-[#A855F7]/50"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#A855F7] px-4 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(168,85,247,0.35)] transition hover:brightness-110 disabled:opacity-70"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Enviando...
              </>
            ) : (
              "Enviar cotação"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/50">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-[#0F0F10] px-3 py-2 text-sm outline-none focus:border-[#A855F7]/50"
      />
    </div>
  );
}
