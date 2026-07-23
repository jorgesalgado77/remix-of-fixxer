import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";

// =============================================================================
// TIPOS
// =============================================================================

type Sector =
  | "Marmoria & Pedras"
  | "Vidraçaria & Espelhos"
  | "Ferragens & Insumos"
  | "Iluminação LED"
  | "Softwares & Maquinário";

type B2BStatus = "aberto" | "urgente" | "negociando";

type B2BRequest = {
  id: string;
  store: {
    name: string;
    initials: string;
    verified?: boolean;
  };
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
    store: { name: "Marcenaria Premium", initials: "MP", verified: true },
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
    store: { name: "Lojas Inovamad", initials: "LI", verified: true },
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
    store: { name: "Ferragens Norte Design", initials: "FN" },
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
    store: { name: "Studio Iluminar", initials: "SI", verified: true },
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
    store: { name: "Fábrica Modular Sul", initials: "FS", verified: true },
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
];

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
      const raw = window.localStorage.getItem("fixxer:parceiro:saved");
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState<B2BRequest | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "fixxer:parceiro:saved",
        JSON.stringify(Array.from(saved)),
      );
    } catch {
      /* ignore */
    }
  }, [saved]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return MOCK_REQUESTS.filter((r) => {
      if (activeSector !== "Todas as Demandas" && r.sector !== activeSector)
        return false;
      if (!term) return true;
      return (
        r.title.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.store.name.toLowerCase().includes(term) ||
        r.city.toLowerCase().includes(term) ||
        r.state.toLowerCase().includes(term)
      );
    });
  }, [search, activeSector]);

  const toggleSaved = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast("Oportunidade removida dos salvos");
      } else {
        next.add(id);
        toast.success("Oportunidade salva no seu mural");
      }
      return next;
    });
  };

  const openChat = (r: B2BRequest) => {
    toast.success(`Abrindo canal B2B com ${r.store.name}...`);
    navigate({ to: "/chat" }).catch(() => undefined);
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
            className="rounded-full border border-white/10 bg-[#1A1A1B] p-2 text-white/80 transition hover:border-[#00FF87]/40 hover:text-[#00FF87]"
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
                    ? "border-[#00FF87] bg-[#00FF87]/10 text-[#00FF87] shadow-[0_0_16px_rgba(0,255,135,0.25)]"
                    : "border-white/10 bg-[#1A1A1B] text-white/70 hover:border-white/20"
                }`}
              >
                {s}
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
            <Building2 className="h-3.5 w-3.5 text-[#00FF87]" />
            Feed do Fornecedor
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#1A1A1B] p-8 text-center text-sm text-white/60">
            Nenhuma demanda encontrada para os filtros atuais.
          </div>
        ) : (
          <ul className="space-y-4">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#1A1A1B]"
              >
                {/* Cabeçalho */}
                <div className="flex items-start gap-3 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0A0A0B] text-sm font-semibold text-[#00FF87]">
                    {r.store.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <span className="truncate">{r.store.name}</span>
                      {r.store.verified && (
                        <span className="rounded-full bg-[#00FF87]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#00FF87]">
                          ✓
                        </span>
                      )}
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
                  <h3 className="text-base font-semibold leading-snug">
                    {r.title}
                  </h3>
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
                  <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#00FF87]">
                    <FileText className="h-3.5 w-3.5" />
                    Especificações
                  </div>
                  <ul className="space-y-1 text-sm text-white/80">
                    {r.specs.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00FF87]/70" />
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

                {/* Barra de ações */}
                <div className="flex items-center gap-2 border-t border-white/10 bg-[#0F0F10] p-3">
                  <button
                    type="button"
                    onClick={() => setQuoteOpen(r)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#00FF87] px-4 py-2.5 text-sm font-semibold text-black shadow-[0_0_20px_rgba(0,255,135,0.35)] transition hover:brightness-110"
                  >
                    <Package className="h-4 w-4" />
                    Enviar cotação B2B
                  </button>
                  <button
                    type="button"
                    onClick={() => openChat(r)}
                    className="rounded-full border border-white/10 bg-[#1A1A1B] p-2.5 text-white/80 transition hover:border-[#00FF87]/40 hover:text-[#00FF87]"
                    aria-label="Chat direto B2B"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSaved(r.id)}
                    className={`rounded-full border p-2.5 transition ${
                      saved.has(r.id)
                        ? "border-[#00FF87]/50 bg-[#00FF87]/10 text-[#00FF87]"
                        : "border-white/10 bg-[#1A1A1B] text-white/80 hover:border-[#00FF87]/40 hover:text-[#00FF87]"
                    }`}
                    aria-label="Salvar oportunidade"
                  >
                    <Bookmark
                      className={`h-4 w-4 ${saved.has(r.id) ? "fill-current" : ""}`}
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
          onClose={() => setQuoteOpen(null)}
          onSubmit={() => {
            toast.success(`Cotação enviada para ${quoteOpen.store.name}`);
            setQuoteOpen(null);
          }}
        />
      )}
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
  onClose,
  onSubmit,
}: {
  request: B2BRequest;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [price, setPrice] = useState("");
  const [payment, setPayment] = useState("");
  const [delivery, setDelivery] = useState("");
  const [notes, setNotes] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!price.trim() || !payment.trim() || !delivery.trim()) {
      toast.error("Preencha preço, condições e prazo.");
      return;
    }
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-white/10 bg-[#1A1A1B] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#00FF87]">
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
              className="w-full rounded-lg border border-white/10 bg-[#0F0F10] px-3 py-2 text-sm outline-none focus:border-[#00FF87]/50"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-[#00FF87] px-4 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(0,255,135,0.35)] transition hover:brightness-110"
          >
            Enviar cotação
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
        className="w-full rounded-lg border border-white/10 bg-[#0F0F10] px-3 py-2 text-sm outline-none focus:border-[#00FF87]/50"
      />
    </div>
  );
}
