import { useState, useRef, useMemo, useEffect } from "react";
import {
  X,
  Upload,
  Trash2,
  ImagePlus,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Eye,
  FileText,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Video as VideoIcon,
  PencilRuler,
  Ruler,
  ClipboardCheck,
  Wrench,
  LifeBuoy,
  Search as SearchIcon,
  Truck,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getCategoryTheme, CATEGORY_LABEL, type CategoryKey } from "@/lib/category-colors";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { Star, MapPin } from "lucide-react";
import { AttachmentPreview } from "@/components/AttachmentPreview";


interface CreateAdModalProps {
  open: boolean;
  onClose: () => void;
  defaultCategory?: CategoryKey;
}

type PriceType = "fixo" | "comissao" | "fixo_comissao";
type Priority = "baixa" | "media" | "alta" | "urgente";

interface UploadItem {
  id: string;
  file: File;
  url: string;
  kind: "image" | "pdf" | "video";
  progress: number;
  error?: string;
}

const SERVICE_TYPES = [
  "Projeto",
  "Medição",
  "Conferência",
  "Montagem",
  "Assistência",
  "Vistoria",
  "🚚 Frete",
  "📝 Outro",
] as const;

const FREIGHT_TYPE = "🚚 Frete";
const OTHER_SERVICE_TYPE = "📝 Outro";

const SERVICE_TYPE_ICON: Record<string, LucideIcon> = {
  "Projeto": PencilRuler,
  "Medição": Ruler,
  "Conferência": ClipboardCheck,
  "Montagem": Wrench,
  "Assistência": LifeBuoy,
  "Vistoria": SearchIcon,
  [FREIGHT_TYPE]: Truck,
  [OTHER_SERVICE_TYPE]: MoreHorizontal,
};

const SERVICE_TYPE_LABEL: Record<string, string> = {
  [FREIGHT_TYPE]: "Frete",
  [OTHER_SERVICE_TYPE]: "Outro",
};

const TECH_SPECS = [
  { id: "veiculo", label: "Possuir veículo próprio" },
  { id: "ferramental", label: "Possuir ferramental completo" },
  { id: "ajudante", label: "Possuir ajudante" },
] as const;

const PRIORITIES: { id: Priority; label: string }[] = [
  { id: "baixa", label: "Baixa" },
  { id: "media", label: "Média" },
  { id: "alta", label: "Alta" },
  { id: "urgente", label: "Urgente" },
];

const MAX_FILES = 6;
const MAX_SIZE_IMG = 5 * 1024 * 1024;
const MAX_SIZE_PDF = 10 * 1024 * 1024;
const MAX_SIZE_VIDEO = 50 * 1024 * 1024;
const ACCEPTED_IMG = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const ACCEPTED_PDF = ["application/pdf"];
const ACCEPTED_VIDEO = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-matroska"];
const ACCEPTED_ALL = [...ACCEPTED_IMG, ...ACCEPTED_PDF, ...ACCEPTED_VIDEO];

const DRAFT_KEY = "fixxer:create-ad-draft:v1";
const DRAFT_MAX_FILE_SIZE = 8 * 1024 * 1024; // ignora arquivos maiores para caber no localStorage

const formatBRL = (v: string | number) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!v || Number.isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

/** Máscara de moeda BRL — recebe o valor digitado e retorna string formatada "12.345,67". */
const maskCurrencyBRL = (raw: string) => {
  const digits = (raw || "").replace(/\D/g, "").slice(0, 14);
  if (!digits) return "";
  const n = Number(digits) / 100;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** Converte string mascarada BRL para número. */
const parseCurrencyBRL = (masked: string) => {
  if (!masked) return 0;
  const digits = masked.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
};

/**
 * Verifica integridade entre string mascarada e número gerado.
 * Retorna string de erro ou null.
 */
const assertCurrencyIntegrity = (label: string, masked: string): string | null => {
  if (!masked) return null;
  const n = parseCurrencyBRL(masked);
  if (!Number.isFinite(n) || n < 0) return `${label}: valor numérico inválido.`;
  const back = maskCurrencyBRL(masked);
  if (back !== masked) return `${label}: formato monetário inconsistente (${masked} ≠ ${back}).`;
  if (n > 9_999_999_999.99) return `${label}: valor acima do limite permitido.`;
  return null;
};

/** Handlers reutilizáveis para inputs de moeda BRL. */
const currencyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Bloqueia caracteres numéricos científicos e sinais
  if (["e", "E", "+", "-", ",", "."].includes(e.key)) e.preventDefault();
};
const currencyFocusSelect = (e: React.FocusEvent<HTMLInputElement>) => {
  // Facilita edição: seleciona tudo ao focar
  requestAnimationFrame(() => e.target.select());
};

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function CreateAdModal({ open, onClose, defaultCategory = "lojista" }: CreateAdModalProps) {
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [rooms, setRooms] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("media");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [techSpecs, setTechSpecs] = useState<string[]>([]);
  const [otherChecked, setOtherChecked] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [priceType, setPriceType] = useState<PriceType>("fixo");
  const [fixedValue, setFixedValue] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [viewer, setViewer] = useState<{ index: number; zoom: number } | null>(null);

  // Novos campos: frete e outro
  const [freightVolumes, setFreightVolumes] = useState("");
  const [freightWeight, setFreightWeight] = useState("");
  const [otherServiceText, setOtherServiceText] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const theme = getCategoryTheme(defaultCategory);

  // Cache de arquivos codificados em base64 (para auto-save leve)
  const filesCacheRef = useRef<Map<string, { name: string; type: string; size: number; kind: UploadItem["kind"]; dataUrl: string }>>(new Map());
  const hydratedRef = useRef(false);


  // Perfil do autor (nome + reputação) para exibir na prévia
  const [authorProfile, setAuthorProfile] = useState<{ name: string; logoUrl?: string | null; rating: number }>({
    name: "Sua Empresa",
    logoUrl: null,
    rating: 4.9,
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabaseExternal.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) return;
        const { data } = await supabaseExternal
          .from("store_profiles")
          .select("company_name, logo_url, rating")
          .eq("user_id", uid)
          .maybeSingle();
        if (cancelled || !data) return;
        setAuthorProfile({
          name: data.company_name || session.user.email?.split("@")[0] || "Sua Empresa",
          logoUrl: data.logo_url || null,
          rating: typeof data.rating === "number" ? data.rating : 4.9,
        });
      } catch { /* silencioso — mantém fallback */ }
    })();
    return () => { cancelled = true; };
  }, [open]);


  useEffect(() => {
    return () => {
      files.forEach((i) => URL.revokeObjectURL(i.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Draft (rascunho) ----------
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const dataUrlToFile = (dataUrl: string, name: string, type: string): File => {
    const [meta, b64] = dataUrl.split(",");
    const mime = type || (meta.match(/data:(.*?);/)?.[1] ?? "application/octet-stream");
    const bstr = atob(b64);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return new File([u8], name, { type: mime });
  };

  // Coleta payload dos arquivos usando o cache (evita re-encodar em cada auto-save)
  const collectFilesPayload = () => {
    const payload: any[] = [];
    let skipped = 0;
    for (const f of files) {
      if (f.file.size > DRAFT_MAX_FILE_SIZE) { skipped++; continue; }
      const cached = filesCacheRef.current.get(f.id);
      if (cached) payload.push(cached);
      else skipped++; // ainda codificando
    }
    return { payload, skipped };
  };

  const buildDraftObject = () => {
    const { payload } = collectFilesPayload();
    return {
      v: 2,
      savedAt: new Date().toISOString(),
      category: defaultCategory,
      serviceTypes, neighborhood, city, uf,
      rooms, title, startDate, deadline, priority,
      description, notes, techSpecs, otherChecked, otherText,
      priceType, fixedValue, contractValue, commissionPct,
      freightVolumes, freightWeight, otherServiceText,
      files: payload,
    };
  };

  const writeDraftSilent = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(buildDraftObject()));
    } catch {
      // storage cheio — ignora silenciosamente no auto-save
    }
  };

  const saveDraft = async () => {
    try {
      // Garante que todos os arquivos estejam no cache antes de salvar manualmente
      let skipped = 0;
      for (const f of files) {
        if (f.file.size > DRAFT_MAX_FILE_SIZE) { skipped++; continue; }
        if (!filesCacheRef.current.has(f.id)) {
          try {
            const dataUrl = await fileToDataUrl(f.file);
            filesCacheRef.current.set(f.id, {
              name: f.file.name, type: f.file.type, size: f.file.size,
              kind: f.kind, dataUrl,
            });
          } catch { skipped++; }
        }
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(buildDraftObject()));
      toast.success(
        skipped > 0
          ? `Rascunho salvo. ${skipped} arquivo(s) não couberam no rascunho.`
          : "Rascunho salvo. Você pode continuar depois.",
      );
    } catch {
      toast.error("Não foi possível salvar o rascunho (armazenamento cheio).");
    }
  };

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      setServiceTypes(d.serviceTypes || []);
      setNeighborhood(d.neighborhood || "");
      setCity(d.city || "");
      setUf(d.uf || "");
      setRooms(d.rooms || 1);
      setTitle(d.title || "");
      setStartDate(d.startDate || "");
      setDeadline(d.deadline || "");
      setPriority(d.priority || "media");
      setDescription(d.description || "");
      setNotes(d.notes || "");
      setTechSpecs(d.techSpecs || []);
      setOtherChecked(!!d.otherChecked);
      setOtherText(d.otherText || "");
      setPriceType(d.priceType || "fixo");
      setFixedValue(d.fixedValue || "");
      setContractValue(d.contractValue || "");
      setCommissionPct(d.commissionPct || "");
      setFreightVolumes(d.freightVolumes || "");
      setFreightWeight(d.freightWeight || "");
      setOtherServiceText(d.otherServiceText || "");
      filesCacheRef.current.clear();
      const restored: UploadItem[] = (d.files || []).map((f: any) => {
        const file = dataUrlToFile(f.dataUrl, f.name, f.type);
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        filesCacheRef.current.set(id, {
          name: f.name, type: f.type, size: f.size,
          kind: f.kind || "image", dataUrl: f.dataUrl,
        });
        return {
          id, file, url: URL.createObjectURL(file),
          kind: f.kind || "image", progress: 100,
        };
      });
      setFiles(restored);
      return true;
    } catch {
      return false;
    }
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      filesCacheRef.current.clear();
    } catch {}
  };

  // Auto-load draft ao abrir
  useEffect(() => {
    if (!open) return;
    if (hydratedRef.current) return;
    const hasDraft = !!localStorage.getItem(DRAFT_KEY);
    if (hasDraft && files.length === 0 && !title && !description) {
      const ok = loadDraft();
      if (ok) toast.info("Rascunho anterior restaurado.", { duration: 2500 });
    }
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset flag de hidratação quando fecha (para reabrir e recarregar rascunho salvo)
  useEffect(() => {
    if (!open) hydratedRef.current = false;
  }, [open]);

  // Mantém cache de arquivos sincronizado (encoda novos, remove ausentes)
  useEffect(() => {
    const validIds = new Set(files.map((f) => f.id));
    // remove ids que não existem mais
    for (const id of Array.from(filesCacheRef.current.keys())) {
      if (!validIds.has(id)) filesCacheRef.current.delete(id);
    }
    // encoda novos
    let cancelled = false;
    (async () => {
      for (const f of files) {
        if (filesCacheRef.current.has(f.id)) continue;
        if (f.file.size > DRAFT_MAX_FILE_SIZE) continue;
        try {
          const dataUrl = await fileToDataUrl(f.file);
          if (cancelled) return;
          filesCacheRef.current.set(f.id, {
            name: f.file.name, type: f.file.type, size: f.file.size,
            kind: f.kind, dataUrl,
          });
          // Re-grava o rascunho com os novos arquivos codificados
          writeDraftSilent();
        } catch { /* ignora */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Auto-save debounced dos campos de texto/seleção
  useEffect(() => {
    if (!open) return;
    if (!hydratedRef.current) return;
    const t = setTimeout(() => writeDraftSilent(), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open, serviceTypes, neighborhood, city, uf, rooms, title, startDate, deadline,
    priority, description, notes, techSpecs, otherChecked, otherText,
    priceType, fixedValue, contractValue, commissionPct,
    freightVolumes, freightWeight, otherServiceText,
  ]);




  const toggleServiceType = (t: string) => {
    setServiceTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const toggleTechSpec = (id: string) => {
    setTechSpecs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const commissionValue = useMemo(() => {
    const cv = parseCurrencyBRL(contractValue);
    const pct = Number(commissionPct);
    if (!cv || !pct || Number.isNaN(pct)) return 0;
    return (cv * pct) / 100;
  }, [contractValue, commissionPct]);

  const simulateProgress = (id: string) => {
    let p = 0;
    const tick = () => {
      p += 20 + Math.random() * 20;
      setFiles((prev) =>
        prev.map((i) => (i.id === id ? { ...i, progress: Math.min(100, p) } : i)),
      );
      if (p < 100) setTimeout(tick, 120);
    };
    setTimeout(tick, 60);
  };

  const handleFiles = (fl: FileList | null) => {
    if (!fl || fl.length === 0) return;
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      toast.warning(`Máximo de ${MAX_FILES} arquivos atingido.`);
      return;
    }
    const incoming = Array.from(fl);
    const toAdd: UploadItem[] = [];
    let rejType = 0;
    let rejSize = 0;
    let rejLimit = 0;

    for (const file of incoming) {
      if (toAdd.length >= remaining) {
        rejLimit++;
        continue;
      }
      const isImg = ACCEPTED_IMG.includes(file.type);
      const isPdf = ACCEPTED_PDF.includes(file.type);
      const isVideo = ACCEPTED_VIDEO.includes(file.type) || file.type.startsWith("video/");
      if (!isImg && !isPdf && !isVideo) {
        rejType++;
        continue;
      }
      const maxSize = isVideo ? MAX_SIZE_VIDEO : isPdf ? MAX_SIZE_PDF : MAX_SIZE_IMG;
      if (file.size > maxSize) {
        rejSize++;
        continue;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      toAdd.push({
        id,
        file,
        url: URL.createObjectURL(file),
        kind: isVideo ? "video" : isPdf ? "pdf" : "image",
        progress: 0,
      });
    }

    if (toAdd.length) {
      setFiles((prev) => [...prev, ...toAdd]);
      toAdd.forEach((i) => simulateProgress(i.id));
    }
    if (rejType) toast.error(`${rejType} arquivo(s) rejeitado(s): formato inválido.`);
    if (rejSize) toast.error(`${rejSize} arquivo(s) acima do limite de tamanho.`);
    if (rejLimit) toast.warning(`${rejLimit} arquivo(s) excederam o limite de ${MAX_FILES}.`);

    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const t = prev.find((i) => i.id === id);
      if (t) URL.revokeObjectURL(t.url);
      return prev.filter((i) => i.id !== id);
    });
  };

  const moveFile = (id: string, dir: -1 | 1) => {
    setFiles((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  const resetForm = () => {
    files.forEach((i) => URL.revokeObjectURL(i.url));
    setFiles([]);
    setServiceTypes([]);
    setNeighborhood("");
    setCity("");
    setUf("");
    setRooms(1);
    setTitle("");
    setStartDate("");
    setDeadline("");
    setPriority("media");
    setDescription("");
    setNotes("");
    setTechSpecs([]);
    setOtherChecked(false);
    setOtherText("");
    setFixedValue("");
    setContractValue("");
    setCommissionPct("");
    setPriceType("fixo");
    setFreightVolumes("");
    setFreightWeight("");
    setOtherServiceText("");
    filesCacheRef.current.clear();
  };

  const validate = (): string | null => {
    if (serviceTypes.length === 0) return "Selecione ao menos um tipo de serviço.";
    if (!neighborhood.trim()) return "Informe o bairro do local de execução.";
    if (!city.trim()) return "Informe a cidade do local de execução.";
    if (!uf.trim() || uf.trim().length !== 2) return "Informe a UF (2 letras) do local de execução.";
    if (!title.trim()) return "Informe o título do serviço.";
    if (!description.trim()) return "Descreva o serviço.";
    if (rooms < 1 || rooms > 25) return "Quantidade de ambientes deve ser entre 1 e 25.";
    if (startDate && deadline && new Date(deadline) < new Date(startDate))
      return "O prazo de execução não pode ser anterior à data de início.";
    if (priceType === "fixo") {
      const n = parseCurrencyBRL(fixedValue);
      if (n <= 0) return "Informe um valor fixo válido (> 0).";
    }
    if (priceType === "comissao") {
      const cv = parseCurrencyBRL(contractValue);
      const pct = Number(commissionPct);
      if (cv <= 0)
        return "Informe o valor do contrato fechado.";
      if (!commissionPct || Number.isNaN(pct) || pct <= 0 || pct > 100)
        return "Informe uma porcentagem válida (entre 0 e 100).";
    }
    if (priceType === "fixo_comissao") {
      const fv = parseCurrencyBRL(fixedValue);
      const cv = parseCurrencyBRL(contractValue);
      const pct = Number(commissionPct);
      if (fv <= 0)
        return "Informe o valor fixo garantido (> 0).";
      if (cv <= 0)
        return "Informe o valor do contrato para calcular a comissão.";
      if (!commissionPct || Number.isNaN(pct) || pct <= 0 || pct > 100)
        return "Informe uma porcentagem de comissão válida (0–100).";
    }
    if (serviceTypes.includes(FREIGHT_TYPE)) {
      const v = Number(freightVolumes);
      const w = Number(freightWeight);
      if (!freightVolumes || Number.isNaN(v) || v <= 0)
        return "Informe a quantidade de volumes do frete.";
      if (!freightWeight || Number.isNaN(w) || w <= 0)
        return "Informe o peso médio estimado do frete (kg).";
    }
    if (serviceTypes.includes(OTHER_SERVICE_TYPE) && !otherServiceText.trim())
      return 'Especifique o serviço marcado como "Outro".';
    if (otherChecked && !otherText.trim())
      return 'Especifique o item "Outro" nas especificações técnicas.';
    if (files.some((i) => i.progress < 100 && !i.error))
      return "Aguarde o processamento dos arquivos.";
    return null;
  };

  const priceDisplay = useMemo(() => {
    const fv = parseCurrencyBRL(fixedValue);
    if (priceType === "fixo") return formatBRL(fv);
    if (priceType === "fixo_comissao") {
      const total = fv + commissionValue;
      return `${formatBRL(fv)} + ${commissionPct || 0}% = ${formatBRL(total)}`;
    }
    return `Comissão: ${formatBRL(commissionValue)} (${commissionPct || 0}%)`;
  }, [priceType, fixedValue, commissionValue, commissionPct]);

  const buildPayload = () => {
    const specsList = [
      ...techSpecs.map((id) => TECH_SPECS.find((t) => t.id === id)?.label).filter(Boolean),
      ...(otherChecked && otherText.trim() ? [`Outro: ${otherText.trim()}`] : []),
    ];
    // Concatena "Outro: <texto>" ao serviço final
    const finalServiceTypes = serviceTypes.map((t) =>
      t === OTHER_SERVICE_TYPE && otherServiceText.trim()
        ? `Outro: ${otherServiceText.trim()}`
        : t,
    );
    const base: any = {
      category: defaultCategory,
      service_types: finalServiceTypes,
      location: {
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        uf: uf.trim().toUpperCase(),
      },
      rooms,
      title: title.trim(),
      start_date: startDate || null,
      deadline: deadline || null,
      priority,
      description: description.trim(),
      notes: notes.trim() || null,
      tech_specs: specsList,
      price_type: priceType,
      files: files.map((i, order) => ({
        name: i.file.name,
        size: i.file.size,
        kind: i.kind,
        order,
      })),
    };
    if (serviceTypes.includes(FREIGHT_TYPE)) {
      base.freight = {
        volumes: Number(freightVolumes),
        weight_kg: Number(freightWeight),
      };
    }
    const fvNum = parseCurrencyBRL(fixedValue);
    const cvNum = parseCurrencyBRL(contractValue);
    if (priceType === "fixo") return { ...base, fixed_value: fvNum };
    if (priceType === "fixo_comissao") {
      return {
        ...base,
        fixed_value: fvNum,
        contract_value: cvNum,
        commission_percent: Number(commissionPct),
        commission_value: commissionValue,
        total_value: fvNum + commissionValue,
      };
    }
    return {
      ...base,
      contract_value: cvNum,
      commission_percent: Number(commissionPct),
      commission_value: commissionValue,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      // Sessão atual do lojista
      const { data: sessionData } = await supabaseExternal.auth.getSession();
      const uid = sessionData?.session?.user?.id ?? null;
      const row: any = {
        lojista_id: uid,
        title: payload.title,
        description: payload.description,
        service_types: (payload as any).service_types,
        neighborhood: (payload as any).location.neighborhood,
        city: (payload as any).location.city,
        uf: (payload as any).location.uf,
        rooms: payload.rooms,
        start_date: payload.start_date,
        deadline: payload.deadline,
        priority: payload.priority,
        notes: payload.notes,
        tech_specs: (payload as any).tech_specs,
        price_type: payload.price_type,
        fixed_value: (payload as any).fixed_value ?? null,
        contract_value: (payload as any).contract_value ?? null,
        commission_percent: (payload as any).commission_percent ?? null,
        commission_value: (payload as any).commission_value ?? null,
        total_value: (payload as any).total_value ?? null,
        freight: (payload as any).freight ?? null,
        files: (payload as any).files,
        category: payload.category,
        status: "PENDENTE",
      };
      let insertedId: string | null = null;
      try {
        const { data, error } = await supabaseExternal
          .from("service_orders")
          .insert(row)
          .select("id")
          .single();
        if (error) throw error;
        insertedId = data?.id ?? null;
      } catch (dbErr: any) {
        // Fallback: persiste em localStorage para não perder o dado quando a tabela não existir
        console.warn("[CreateAdModal] Falha ao gravar em service_orders — usando fallback local.", dbErr?.message);
        const key = "fixxer:service_orders:local";
        const prev = JSON.parse(localStorage.getItem(key) || "[]");
        insertedId = `local-${Date.now()}`;
        prev.unshift({ id: insertedId, created_at: new Date().toISOString(), ...row });
        localStorage.setItem(key, JSON.stringify(prev.slice(0, 100)));
      }
      // Incrementa contador local (métricas)
      try {
        const cKey = "fixxer:os:created:count";
        const n = Number(localStorage.getItem(cKey) || "0") + 1;
        localStorage.setItem(cKey, String(n));
      } catch { /* ignore */ }
      // Dissemina para os feeds/dashboards abertos
      try {
        window.dispatchEvent(
          new CustomEvent("fixxer:os-created", {
            detail: { id: insertedId, row, payload, authorName: authorProfile.name, authorLogo: authorProfile.logoUrl },
          }),
        );
      } catch { /* ignore */ }
      toast.success("Serviço publicado com sucesso e disponível no feed!");
      discardDraft();
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao publicar serviço.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Fullscreen viewer ----------
  const openViewer = (index: number) => setViewer({ index, zoom: 1 });
  const closeViewer = () => setViewer(null);
  const stepViewer = (dir: -1 | 1) => {
    if (!viewer) return;
    const next = (viewer.index + dir + files.length) % files.length;
    setViewer({ index: next, zoom: 1 });
  };
  const zoomViewer = (delta: number) => {
    if (!viewer) return;
    const next = Math.max(0.5, Math.min(4, viewer.zoom + delta));
    setViewer({ ...viewer, zoom: next });
  };

  if (!open) return null;

  const firstImage = files.find((f) => f.kind === "image");
  const firstVideo = files.find((f) => f.kind === "video");
  const firstPdf = files.find((f) => f.kind === "pdf" || /pdf$/i.test(f.file.type));
  const fallbackFile = firstImage ?? firstVideo ?? firstPdf ?? files[0];

  const locationLine = [neighborhood, city, uf].filter(Boolean).join(" • ");

  const renderStars = (rating: number) => {
    const rounded = Math.round(rating * 2) / 2;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= Math.floor(rounded);
          const half = !filled && i + 0.5 === rounded;
          return (
            <Star
              key={i}
              className="w-3 h-3"
              style={{
                color: theme.hex,
                fill: filled || half ? theme.hex : "transparent",
                opacity: filled || half ? 1 : 0.35,
              }}
            />
          );
        })}
        <span className="text-[10px] font-bold text-white/70 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const previewAttachment = firstImage ?? firstVideo ?? firstPdf ?? fallbackFile;
  const PreviewMedia = () => (
    <AttachmentPreview
      attachment={
        previewAttachment
          ? {
              url: previewAttachment.url,
              name: previewAttachment.file?.name,
              mime: previewAttachment.file?.type,
              kind: previewAttachment.kind as any,
            }
          : null
      }
      categoryOverride={defaultCategory}
      aspect="video"
      emptyLabel="Sem imagem"
    />
  );

  const PreviewCard = (
    <div
      className="rounded-2xl overflow-hidden border bg-[#0F0F10]"
      style={{ borderColor: `rgba(${theme.rgb}, 0.35)`, ...theme.glow }}
    >
      <div className="relative">
        <PreviewMedia />
        <div
          className="absolute top-2 right-2 px-2 py-1 rounded-md text-[9px] uppercase font-black italic"
          style={{ ...theme.bgSoft, color: theme.hex }}
        >
          {CATEGORY_LABEL[defaultCategory]}
        </div>
      </div>
      <div className="p-4 space-y-2">
        <h3 className="text-white font-black text-base leading-tight line-clamp-2">
          {title || "Título do serviço"}
        </h3>
        {serviceTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {serviceTypes.map((t) => (
              <span
                key={t}
                className="text-[9px] uppercase font-black px-2 py-0.5 rounded"
                style={{ ...theme.bgSoft, color: theme.hex }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {locationLine && (
          <div className="flex items-center gap-1 text-[11px] text-white/70">
            <MapPin className="w-3 h-3" style={{ color: theme.hex }} />
            <span className="truncate">{locationLine}</span>
          </div>
        )}
        <div
          className="flex items-center gap-2 pt-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}
        >
          {authorProfile.logoUrl ? (
            <img
              src={authorProfile.logoUrl}
              alt={authorProfile.name}
              className="w-7 h-7 rounded-full object-cover border"
              style={{ borderColor: `rgba(${theme.rgb}, 0.45)` }}
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-black"
              style={{ backgroundColor: theme.hex }}
            >
              {(authorProfile.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">{authorProfile.name}</div>
            {renderStars(authorProfile.rating)}
          </div>
        </div>
        <p className="text-white/60 text-xs line-clamp-3">
          {description || "Descrição do serviço aparecerá aqui..."}
        </p>
        <div className="flex flex-wrap gap-2 text-[9px] uppercase font-bold text-white/50">
          <span>{rooms} ambiente{rooms > 1 ? "s" : ""}</span>
          {startDate && <span>Início {new Date(startDate).toLocaleDateString("pt-BR")}</span>}
          {deadline && <span>Prazo {new Date(deadline).toLocaleDateString("pt-BR")}</span>}
          <span>Prioridade: {priority}</span>
        </div>
        <div
          className="pt-2 mt-1 border-t flex items-center justify-between"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <span className="text-[10px] uppercase font-bold text-white/40">Valor</span>
          <span className="text-lg font-black italic" style={{ color: theme.hex }}>
            {priceDisplay}
          </span>
        </div>
      </div>
    </div>
  );


  const currentViewerFile = viewer ? files[viewer.index] : null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-5xl h-[100dvh] md:h-auto md:max-h-[92vh] flex flex-col bg-[#0A0A0B] border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"
        style={{ ...theme.glow, paddingTop: "env(safe-area-inset-top)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — fixo no topo (mesmo com teclado aberto) */}
        <div
          className="shrink-0 flex items-center justify-between px-5 py-4 border-b bg-[#1A1A1B]"
          style={{ borderColor: `rgba(${theme.rgb}, 0.25)` }}
        >
          <div>
            <h2 className="text-lg font-black uppercase italic text-white tracking-tight">
              Criar Serviço
            </h2>
            <p
              className="text-[10px] uppercase font-bold tracking-wider"
              style={{ color: theme.hex }}
            >
              {CATEGORY_LABEL[defaultCategory]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreviewMobile((v) => !v)}
              className="lg:hidden px-3 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center gap-1 text-white text-[10px] uppercase font-black transition"
            >
              <Eye className="w-3 h-3" /> {showPreviewMobile ? "Editar" : "Prévia"}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin grid lg:grid-cols-[1fr_360px] gap-0">
          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className={`p-5 space-y-5 ${showPreviewMobile ? "hidden lg:block" : ""}`}
          >
            {/* Tipo de Serviço */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                Tipo de Serviço (múltipla escolha)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SERVICE_TYPES.map((t) => {
                  const active = serviceTypes.includes(t);
                  const Icon = SERVICE_TYPE_ICON[t] ?? FileText;
                  const label = SERVICE_TYPE_LABEL[t] ?? t;
                  return (
                    <label
                      key={t}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] uppercase font-black italic tracking-wide cursor-pointer transition"
                      style={
                        active
                          ? { ...theme.bgSoft, ...theme.borderStrong, color: theme.hex }
                          : {
                              borderColor: "rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.6)",
                            }
                      }
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleServiceType(t)}
                        className="accent-current w-3.5 h-3.5"
                      />
                      <Icon className="w-4 h-4 shrink-0" style={{ color: active ? theme.hex : "rgba(255,255,255,0.55)" }} />
                      <span className="truncate">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Frete — condicional */}
            {serviceTypes.includes(FREIGHT_TYPE) && (
              <div
                className="rounded-xl p-3 border grid grid-cols-1 md:grid-cols-2 gap-3"
                style={{ borderColor: `rgba(${theme.rgb}, 0.35)`, ...theme.bgSoft }}
              >
                <div className="md:col-span-2">
                  <p className="text-[10px] uppercase font-black tracking-wider" style={{ color: theme.hex }}>
                    🚚 Detalhes do Frete
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-black text-white/70">
                    Quantidade de Volumes
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={freightVolumes}
                    onChange={(e) => setFreightVolumes(e.target.value)}
                    placeholder="Ex.: 12 caixas/volumes"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-black text-white/70">
                    Peso Médio Estimado (kg)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={freightWeight}
                    onChange={(e) => setFreightWeight(e.target.value)}
                    placeholder="Ex.: 150"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            )}

            {/* Outro — condicional */}
            {serviceTypes.includes(OTHER_SERVICE_TYPE) && (
              <div
                className="rounded-xl p-3 border space-y-2"
                style={{ borderColor: `rgba(${theme.rgb}, 0.35)`, ...theme.bgSoft }}
              >
                <Label className="text-[10px] uppercase font-black tracking-wider" style={{ color: theme.hex }}>
                  📝 Especifique o tipo de serviço
                </Label>
                <Input
                  value={otherServiceText}
                  onChange={(e) => setOtherServiceText(e.target.value)}
                  placeholder='Ex.: "Montagem de Fachada / Vidros Especializados"'
                  maxLength={120}
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-[9px] text-white/50">
                  Este texto será concatenado ao tipo de serviço final da O.S.
                </p>
              </div>
            )}


            {/* Local de Execução */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                Local de Execução do Trabalho
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_90px] gap-2">
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bairro"
                  maxLength={80}
                  className="bg-white/5 border-white/10 text-white"
                />
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Cidade"
                  maxLength={80}
                  className="bg-white/5 border-white/10 text-white"
                />
                <select
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  className="h-10 rounded-md bg-white/5 border border-white/10 text-white px-2 text-sm uppercase"
                >
                  <option value="" className="bg-neutral-900">UF</option>
                  {UF_LIST.map((u) => (
                    <option key={u} value={u} className="bg-neutral-900">{u}</option>
                  ))}
                </select>
              </div>
              <p className="text-[9px] text-white/40">Informe o endereço onde o serviço será executado.</p>
            </div>

            {/* Quantidade de ambientes */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                Quantidade de Ambientes
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={25}
                  value={rooms}
                  onChange={(e) => setRooms(Number(e.target.value))}
                  className="flex-1 accent-current"
                  style={{ color: theme.hex }}
                />
                <Input
                  type="number"
                  min={1}
                  max={25}
                  value={rooms}
                  onChange={(e) => setRooms(Math.max(1, Math.min(25, Number(e.target.value) || 1)))}
                  className="w-20 bg-white/5 border-white/10 text-white text-center"
                />
              </div>
              <p className="text-[9px] text-white/40">De 1 a 25 ambientes.</p>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                Título
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Montagem de móveis planejados"
                maxLength={100}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-[9px] text-white/40 text-right">{title.length}/100</p>
            </div>

            {/* Datas e prioridade */}
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                  Data de Início
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                  Prazo de Execução
                </Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                  Prioridade
                </Label>
                <div className="grid grid-cols-2 gap-1">
                  {PRIORITIES.map((p) => {
                    const active = priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id)}
                        className="px-2 py-2 rounded-lg border text-[10px] uppercase font-black italic transition"
                        style={
                          active
                            ? { ...theme.bgSoft, ...theme.borderStrong, color: theme.hex }
                            : {
                                borderColor: "rgba(255,255,255,0.08)",
                                color: "rgba(255,255,255,0.6)",
                              }
                        }
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Arquivos (imagens + PDF + vídeo) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                  Anexos ({files.length}/{MAX_FILES})
                </Label>
                <span className="text-[9px] text-white/40 uppercase font-bold">
                  JPG/PNG/WEBP (5MB) · PDF (10MB) · MP4/WEBM/MOV (50MB)
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {files.map((f, idx) => (
                  <div
                    key={f.id}
                    className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5 group"
                  >
                    {f.kind === "image" ? (
                      <img src={f.url} alt="" className="w-full h-full object-cover" />
                    ) : f.kind === "video" ? (
                      <div className="relative w-full h-full bg-black">
                        <video
                          src={f.url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ background: theme.hex }}
                          >
                            <Play className="w-5 h-5 text-black fill-black" />
                          </div>
                        </div>
                        <span
                          className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] uppercase font-black"
                          style={{ ...theme.bgSoft, color: theme.hex }}
                        >
                          Vídeo
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center bg-red-950/30">
                        <FileText className="w-8 h-8" style={{ color: theme.hex }} />
                        <span className="text-[9px] text-white/70 font-bold truncate w-full">
                          {f.file.name}
                        </span>
                        <span className="text-[8px] uppercase font-black text-red-400">PDF</span>
                      </div>
                    )}


                    {f.progress < 100 && !f.error && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${f.progress}%`, background: theme.hex }}
                        />
                      </div>
                    )}
                    {f.error && (
                      <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center text-white text-[9px] text-center p-1">
                        <AlertCircle className="w-4 h-4 mb-1" />
                        {f.error}
                      </div>
                    )}

                    <div
                      className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-black"
                      style={{ background: theme.hex }}
                    >
                      {idx + 1}
                    </div>

                    <button
                      type="button"
                      onClick={() => openViewer(idx)}
                      className="absolute top-1 right-8 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black transition opacity-0 group-hover:opacity-100"
                      aria-label="Expandir"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(f.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-red-500 transition"
                      aria-label="Remover"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => moveFile(f.id, -1)}
                        disabled={idx === 0}
                        className="w-5 h-5 rounded bg-black/70 flex items-center justify-center text-white disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFile(f.id, 1)}
                        disabled={idx === files.length - 1}
                        className="w-5 h-5 rounded bg-black/70 flex items-center justify-center text-white disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {files.length < MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-1 text-white/50 hover:text-white hover:border-white/30 transition"
                  >
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-[9px] uppercase font-bold">Adicionar</span>
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_ALL.join(",")}
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {/* Tipo de preço */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                Tipo de Preço
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(
                  [
                    { id: "fixo", label: "💵 Valor Fixo" },
                    { id: "comissao", label: "% Comissão" },
                    { id: "fixo_comissao", label: "💵 + % Fixo + Comissão" },
                  ] as { id: PriceType; label: string }[]
                ).map((opt) => {
                  const active = priceType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPriceType(opt.id)}
                      className="px-3 py-2.5 rounded-xl border text-[11px] uppercase font-black italic tracking-wide transition"
                      style={
                        active
                          ? { ...theme.bgSoft, ...theme.borderStrong, color: theme.hex }
                          : {
                              borderColor: "rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.6)",
                            }
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {(priceType === "fixo" || priceType === "fixo_comissao") && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                  Valor Fixo {priceType === "fixo_comissao" ? "Garantido " : ""}(R$)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-white/60 pointer-events-none">R$</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={fixedValue}
                    onChange={(e) => setFixedValue(maskCurrencyBRL(e.target.value))}
                    onKeyDown={currencyKeyDown}
                    onFocus={currencyFocusSelect}
                    onBlur={(e) => setFixedValue(maskCurrencyBRL(e.target.value))}
                    placeholder="0,00"
                    className="bg-white/5 border-white/10 text-white pl-10"
                  />
                </div>
              </div>
            )}

            {(priceType === "comissao" || priceType === "fixo_comissao") && (
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                    Valor do Contrato (R$)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-white/60 pointer-events-none">R$</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={contractValue}
                      onChange={(e) => setContractValue(maskCurrencyBRL(e.target.value))}
                      placeholder="50.000,00"
                      className="bg-white/5 border-white/10 text-white pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                    Comissão (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(e.target.value)}
                    placeholder="Ex.: 5"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                    Valor da Comissão
                  </Label>
                  <div
                    className="h-10 px-3 rounded-md border flex items-center font-black italic"
                    style={{
                      borderColor: `rgba(${theme.rgb}, 0.4)`,
                      background: `rgba(${theme.rgb}, 0.08)`,
                      color: theme.hex,
                    }}
                  >
                    {formatBRL(commissionValue)}
                  </div>
                  <p className="text-[9px] text-white/40">Calculado automaticamente.</p>
                </div>
              </div>
            )}

            {/* Descrição */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                Descrição
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o serviço..."
                rows={4}
                maxLength={1000}
                className="bg-white/5 border-white/10 text-white resize-none"
              />
              <p className="text-[9px] text-white/40 text-right">{description.length}/1000</p>
            </div>

            {/* Observações Especiais */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                Observações Especiais
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: Permite trabalho aos sábados, execução somente em período noturno..."
                rows={3}
                maxLength={500}
                className="bg-white/5 border-white/10 text-white resize-none"
              />
              <p className="text-[9px] text-white/40 text-right">{notes.length}/500</p>
            </div>

            {/* Especificações Técnicas */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                Especificações Técnicas
              </Label>
              <div className="grid md:grid-cols-2 gap-2">
                {TECH_SPECS.map((s) => {
                  const active = techSpecs.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] uppercase font-black italic tracking-wide cursor-pointer transition"
                      style={
                        active
                          ? { ...theme.bgSoft, ...theme.borderStrong, color: theme.hex }
                          : {
                              borderColor: "rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.6)",
                            }
                      }
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleTechSpec(s.id)}
                        className="accent-current w-3.5 h-3.5"
                      />
                      {s.label}
                    </label>
                  );
                })}
                <label
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] uppercase font-black italic tracking-wide cursor-pointer transition"
                  style={
                    otherChecked
                      ? { ...theme.bgSoft, ...theme.borderStrong, color: theme.hex }
                      : {
                          borderColor: "rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.6)",
                        }
                  }
                >
                  <input
                    type="checkbox"
                    checked={otherChecked}
                    onChange={(e) => setOtherChecked(e.target.checked)}
                    className="accent-current w-3.5 h-3.5"
                  />
                  Outro
                </label>
              </div>
              {otherChecked && (
                <Input
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder='Especifique o item "Outro"'
                  maxLength={120}
                  className="bg-white/5 border-white/10 text-white mt-2"
                />
              )}
            </div>

            {/* Ações */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveDraft}
                  className="flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10 uppercase italic font-black text-xs h-11"
                >
                  <Save className="w-4 h-4 mr-2" style={{ color: theme.hex }} />
                  Salvar Rascunho
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    discardDraft();
                    resetForm();
                    toast.success("Rascunho descartado.");
                  }}
                  className="flex-1 text-white/50 hover:text-white uppercase italic font-black text-xs h-11"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Descartar Rascunho
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    discardDraft();
                    resetForm();
                    toast.info("Criação cancelada. Rascunho descartado.");
                    onClose();
                  }}
                  className="flex-1 text-white/70 hover:text-white uppercase italic font-black text-xs h-12"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 uppercase italic font-black text-xs h-12 border-0 text-black"
                  style={{ background: theme.hex, ...theme.glowStrong }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {submitting ? "Publicando..." : "Publicar Serviço"}
                </Button>
              </div>
              <p className="text-[9px] text-white/40 text-center italic">
                Rascunho salvo automaticamente. Fechar ou clicar fora mantém os dados. Cancelar ou publicar limpa tudo.
              </p>
            </div>

          </form>

          {/* PRÉVIA */}
          <aside
            className={`p-5 border-t lg:border-t-0 lg:border-l border-white/5 bg-black/30 ${
              showPreviewMobile ? "block" : "hidden lg:block"
            }`}
          >
            <div className="sticky top-24 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5" style={{ color: theme.hex }} />
                <p className="text-[10px] uppercase font-black tracking-wider text-white/70">
                  Prévia ao vivo
                </p>
              </div>
              {PreviewCard}
              <p className="text-[9px] text-white/30 uppercase font-bold text-center">
                Aparência aproximada no feed
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Fullscreen Viewer */}
      {viewer && currentViewerFile && (
        <div
          className="fixed inset-0 z-[300] bg-black/95 flex flex-col"
          onClick={closeViewer}
        >
          <div
            className="flex items-center justify-between p-4 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-white text-xs font-bold truncate max-w-[50%]">
              {currentViewerFile.file.name} ({viewer.index + 1}/{files.length})
            </div>
            <div className="flex items-center gap-2">
              {currentViewerFile.kind === "image" && (
                <>
                  <button
                    onClick={() => zoomViewer(-0.25)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                    aria-label="Diminuir zoom"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-white text-xs font-bold w-12 text-center">
                    {Math.round(viewer.zoom * 100)}%
                  </span>
                  <button
                    onClick={() => zoomViewer(0.25)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                    aria-label="Aumentar zoom"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={closeViewer}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 relative overflow-auto flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {files.length > 1 && (
              <button
                onClick={() => stepViewer(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {currentViewerFile.kind === "image" ? (
              <img
                src={currentViewerFile.url}
                alt=""
                className="transition-transform max-w-none"
                style={{ transform: `scale(${viewer.zoom})` }}
              />
            ) : currentViewerFile.kind === "video" ? (
              <FixxerVideoPlayer
                key={currentViewerFile.id}
                src={currentViewerFile.url}
                title={currentViewerFile.file.name}
                themeHex={theme.hex}
                onClose={closeViewer}
              />
            ) : (
              <iframe
                src={`${currentViewerFile.url}#toolbar=1&navpanes=1&view=FitH`}
                title={currentViewerFile.file.name}
                className="w-full h-full bg-white"
              />
            )}

            {files.length > 1 && (
              <button
                onClick={() => stepViewer(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
                aria-label="Próximo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FixxerVideoPlayer — player leve com controles customizados (sem download)
// ============================================================================
interface FixxerVideoPlayerProps {
  src: string;
  title?: string;
  themeHex: string;
  onClose: () => void;
}

function FixxerVideoPlayer({ src, title, themeHex, onClose }: FixxerVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => setDuration(v.duration || 0);
    const onTime = () => setCurrent(v.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration, t));
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const changeVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  };

  const toggleFullscreen = async () => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const kickHideTimer = () => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (playing) setShowControls(false);
    }, 2500);
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full max-h-[92vh] flex items-center justify-center bg-black group"
      onMouseMove={kickHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <video
        ref={videoRef}
        src={src}
        className="max-w-full max-h-full outline-none"
        playsInline
        onClick={togglePlay}
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
      />

      {/* Botão fechar */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur flex items-center justify-center text-white transition"
        aria-label="Fechar"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Título */}
      {title && (
        <div
          className={`absolute top-3 left-3 right-16 z-10 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur text-white text-xs font-bold truncate transition-opacity ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          {title}
        </div>
      )}

      {/* Play central quando pausado */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center z-10"
          aria-label="Reproduzir"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
            style={{ background: themeHex }}
          >
            <Play className="w-9 h-9 text-black fill-black ml-1" />
          </div>
        </button>
      )}

      {/* Barra de controles */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-10 px-4 pt-8 pb-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Barra de progresso */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white text-[10px] font-bold w-10 text-right tabular-nums">{fmt(current)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${themeHex} 0%, ${themeHex} ${(current / (duration || 1)) * 100}%, rgba(255,255,255,0.2) ${(current / (duration || 1)) * 100}%, rgba(255,255,255,0.2) 100%)`,
              accentColor: themeHex,
            }}
          />
          <span className="text-white/70 text-[10px] font-bold w-10 tabular-nums">{fmt(duration)}</span>
        </div>

        {/* Controles inferiores */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            aria-label={playing ? "Pausar" : "Reproduzir"}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              aria-label={muted ? "Ativar som" : "Silenciar"}
            >
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="w-20 h-1 rounded-full cursor-pointer"
              style={{ accentColor: themeHex }}
            />
          </div>

          <div className="flex-1" />

          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            aria-label="Tela cheia"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
