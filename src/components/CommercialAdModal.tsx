import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  X, Upload, Trash2, Megaphone, Tag, Package, Wrench, Truck,
  Store, Globe, CreditCard, Zap, Handshake, Rocket, Info, Save,
  Eye, ArrowLeft, CheckCircle2, Pencil, AlertCircle,
  CalendarDays, CalendarClock, Radius, Coins, Home,
} from "lucide-react";
import { toast } from "sonner";
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  getActionCost,
  spendCoinsForAction,
  getPlanConfig,
  type PlanId,
} from "@/lib/monetization";
import { getCachedBalance, subscribeBalance } from "@/lib/coins";
import { getCategoryTheme, type CategoryKey } from "@/lib/category-colors";
import {
  maskCurrencyBRL,
  parseCurrencyBRL,
  currencyKeyDown,
  currencyFocusSelect,
  currencyPaste,
} from "@/lib/currency-brl";

// =============================================================================
// TIPOS
// =============================================================================

export interface CommercialAdInitial {
  id: string;
  title?: string;
  content?: string;
  category?: CategoryKey;
  metadata?: {
    ad_kind?: AdKind;
    price_from?: number | null;
    price_to?: number | null;
    payments?: PaymentMethod[];
    stock?: number | null;
    delivery?: DeliveryMode[];
    photos?: string[];
    [k: string]: any;
  };
}

interface CommercialAdModalProps {
  open: boolean;
  onClose: () => void;
  defaultCategory?: CategoryKey;
  /** Se informado, o modal opera em modo EDIÇÃO (UPDATE em vez de INSERT). */
  initialAd?: CommercialAdInitial | null;
  /** Callback ao publicar/atualizar com sucesso. */
  onSaved?: (id: string | null) => void;
}

type AdKind = "promo" | "produto" | "pacote" | "atacado";
type PaymentMethod = "cartao" | "pix" | "combinar";
type DeliveryMode = "domicilio" | "retirada" | "frete" | "online";
type UrgencyTag = "urgente" | "normal" | "encomenda";
type Step = "form" | "preview" | "success";

interface AdPhoto {
  id: string;
  file?: File;      // ausente quando é foto pré-existente (edição)
  url: string;      // objectURL (nova) ou URL pública (existente)
  remote?: boolean; // true quando já persistida
}

type FieldKey = "title" | "priceFrom" | "priceTo" | "stock" | "description" | "payments" | "delivery";
type FieldErrors = Partial<Record<FieldKey, string>>;

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMG = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const DRAFT_KEY = "fixxer:commercial-ad-draft:v1";

const AD_KINDS: { id: AdKind; label: string; icon: string; color: string; Icon: typeof Tag }[] = [
  { id: "promo",   label: "Promoção / Liquidação", icon: "🏷️", color: "#FF3B6B", Icon: Tag },
  { id: "produto", label: "Produto Físico",         icon: "📦", color: "#00E5FF", Icon: Package },
  { id: "pacote",  label: "Pacote de Serviço",      icon: "🛠️", color: "#FF9F0A", Icon: Wrench },
  { id: "atacado", label: "Lote B2B / Atacado",     icon: "🚚", color: "#A855F7", Icon: Truck },
];

const PAYMENTS: { id: PaymentMethod; label: string; icon: string; Icon: typeof CreditCard }[] = [
  { id: "cartao",   label: "Cartão de Crédito",     icon: "💳", Icon: CreditCard },
  { id: "pix",      label: "PIX / Dinheiro",        icon: "⚡", Icon: Zap },
  { id: "combinar", label: "Combinar na Entrega",   icon: "🤝", Icon: Handshake },
];

const DELIVERY: { id: DeliveryMode; label: string; icon: string; Icon: typeof Store }[] = [
  { id: "domicilio", label: "À Domicílio",                icon: "🏠", Icon: Home },
  { id: "retirada",  label: "Retirada na Loja / Local",   icon: "🏬", Icon: Store },
  { id: "frete",     label: "Entrega Própria / Frete",    icon: "🚚", Icon: Truck },
  { id: "online",    label: "Atendimento On-line",         icon: "🌐", Icon: Globe },
];

const MAX_VALIDITY_DAYS = 15;
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};
const maxValidityISO = () => addDaysISO(MAX_VALIDITY_DAYS);

// =============================================================================
// VALIDAÇÃO
// =============================================================================

interface FormState {
  title: string;
  priceFrom: string;
  priceTo: string;
  stock: string;
  description: string;
  payments: PaymentMethod[];
  delivery: DeliveryMode[];
}

function validateField(field: FieldKey, s: FormState): string | undefined {
  switch (field) {
    case "title": {
      const v = s.title.trim();
      if (!v) return "Informe o título do anúncio.";
      if (v.length < 8) return "Título muito curto (mín. 8 caracteres).";
      if (v.length > 120) return "Máximo de 120 caracteres.";
      return;
    }
    case "priceTo": {
      const v = parseCurrencyBRL(s.priceTo);
      if (!v || v <= 0) return "Informe o preço promocional (Preço Por).";
      if (v > 9_999_999) return "Valor acima do limite permitido.";
      return;
    }
    case "priceFrom": {
      if (!s.priceFrom) return;
      const from = parseCurrencyBRL(s.priceFrom);
      const to = parseCurrencyBRL(s.priceTo);
      if (from && to && from <= to) return "Preço De deve ser maior que o Preço Por.";
      return;
    }
    case "stock": {
      if (!s.stock) return;
      const n = Number(s.stock);
      if (!Number.isFinite(n) || n < 0) return "Estoque deve ser um número ≥ 0.";
      if (n > 999_999) return "Valor de estoque muito alto.";
      return;
    }
    case "description": {
      const v = s.description.trim();
      if (!v) return "Descreva o anúncio.";
      if (v.length < 20) return `Descrição muito curta (${v.length}/20).`;
      if (v.length > 1200) return "Máximo de 1200 caracteres.";
      return;
    }
    case "payments":
      if (s.payments.length === 0) return "Selecione ao menos uma forma de pagamento.";
      return;
    case "delivery":
      if (s.delivery.length === 0) return "Selecione ao menos uma modalidade de entrega.";
      return;
  }
}

function validateAll(s: FormState): FieldErrors {
  const errors: FieldErrors = {};
  (["title", "priceTo", "priceFrom", "stock", "description", "payments", "delivery"] as FieldKey[])
    .forEach((f) => { const e = validateField(f, s); if (e) errors[f] = e; });
  return errors;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export const CommercialAdModal = memo(function CommercialAdModal({
  open,
  onClose,
  defaultCategory = "lojista",
  initialAd = null,
  onSaved,
}: CommercialAdModalProps) {
  const theme = getCategoryTheme(defaultCategory);
  const navigate = useNavigate();
  const isEditing = !!initialAd?.id;

  const [step, setStep] = useState<Step>("form");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AdKind>("produto");
  const [photos, setPhotos] = useState<AdPhoto[]>([]);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [payments, setPayments] = useState<PaymentMethod[]>(["pix"]);
  const [stock, setStock] = useState("");
  const [delivery, setDelivery] = useState<DeliveryMode[]>(["retirada"]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  // NOVOS CAMPOS ================================================
  const [urgencyTag, setUrgencyTag] = useState<UrgencyTag>("normal");
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(15);
  const [installments, setInstallments] = useState<number>(1);
  const [installmentsInterestFree, setInstallmentsInterestFree] = useState(true);
  const [validityPreset, setValidityPreset] = useState<3 | 7 | 10 | 15 | 0>(7);
  const [validityDate, setValidityDate] = useState<string>(() => addDaysISO(7));

  // Saldo + plano p/ Resumo de Custo
  const [coinBalance, setCoinBalance] = useState<number>(() => getCachedBalance());
  useEffect(() => subscribeBalance(setCoinBalance), []);
  const [userPlanId, setUserPlanId] = useState<PlanId>("free");
  const [freeAdsUsed, setFreeAdsUsed] = useState<number>(0);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabaseExternal.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) return;
        const { data } = await supabaseExternal
          .from("profiles")
          .select("plan")
          .eq("id", uid)
          .maybeSingle();
        if (cancelled) return;
        const p = (data?.plan as PlanId) || "free";
        setUserPlanId(p);
        const key = `fixxer:ads:month:${uid}:${new Date().toISOString().slice(0, 7)}`;
        setFreeAdsUsed(Number(localStorage.getItem(key) || "0"));
      } catch { /* silencioso */ }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const fileRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  const extraCost = getActionCost("publish_extra")?.coins ?? 20;

  const costSummary = useMemo(() => {
    const plan = getPlanConfig(userPlanId);
    const freeQuota = plan?.freeAdsMonthly ?? 0;
    const remainingFree = Math.max(0, freeQuota - freeAdsUsed);
    const baseCost = isEditing ? 0 : (remainingFree > 0 ? 0 : extraCost);
    const urgentCost = urgencyTag === "urgente" && !isEditing
      ? (getActionCost("urgent_neighborhood")?.coins ?? 15) : 0;
    const total = baseCost + urgentCost;
    return {
      planName: plan?.name ?? "Free",
      freeQuota, remainingFree, baseCost, urgentCost, total,
      insufficient: total > coinBalance,
    };
  }, [userPlanId, freeAdsUsed, urgencyTag, coinBalance, isEditing, extraCost]);


  const formState: FormState = { title, priceFrom, priceTo, stock, description, payments, delivery };
  const errors = useMemo(() => validateAll(formState),
    [title, priceFrom, priceTo, stock, description, payments, delivery]); // eslint-disable-line react-hooks/exhaustive-deps
  const isValid = Object.keys(errors).length === 0;

  const markTouched = (f: FieldKey) => setTouched((t) => ({ ...t, [f]: true }));
  const showErr = (f: FieldKey) => (touched[f] || step === "preview") ? errors[f] : undefined;

  // ---------- Hidratação: edição OU rascunho ----------
  useEffect(() => {
    if (!open) return;
    if (hydratedRef.current) return;
    try {
      if (initialAd) {
        setTitle(initialAd.title || "");
        setDescription(initialAd.content || "");
        const m = initialAd.metadata || {};
        setKind((m.ad_kind as AdKind) || "produto");
        setPriceFrom(m.price_from ? maskCurrencyBRL(String(Math.round(m.price_from * 100))) : "");
        setPriceTo(m.price_to ? maskCurrencyBRL(String(Math.round(m.price_to * 100))) : "");
        setPayments((m.payments as PaymentMethod[]) || ["pix"]);
        setStock(m.stock != null ? String(m.stock) : "");
        setDelivery((m.delivery as DeliveryMode[]) || ["retirada"]);
        if (m.urgency_tag) setUrgencyTag(m.urgency_tag as UrgencyTag);
        if (typeof m.service_radius_km === "number") setServiceRadiusKm(m.service_radius_km);
        if (typeof m.installments === "number") setInstallments(m.installments);
        if (typeof m.installments_interest_free === "boolean") setInstallmentsInterestFree(m.installments_interest_free);
        if (typeof m.valid_until === "string") {
          const today = todayISO();
          const max = maxValidityISO();
          const v = m.valid_until > max ? max : m.valid_until < today ? today : m.valid_until;
          setValidityDate(v);
          setValidityPreset(0);
        }
        const existing = (m.photos as string[] | undefined) || [];
        setPhotos(existing.map((url, i) => ({
          id: `remote-${i}-${url.slice(-12)}`,
          url,
          remote: true,
        })));
      } else {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          setTitle(d.title || "");
          setKind(d.kind || "produto");
          setPriceFrom(d.priceFrom || "");
          setPriceTo(d.priceTo || "");
          setPayments(d.payments || ["pix"]);
          setStock(d.stock || "");
          setDelivery(d.delivery || ["retirada"]);
          setDescription(d.description || "");
          if (d.urgencyTag) setUrgencyTag(d.urgencyTag);
          if (typeof d.serviceRadiusKm === "number") setServiceRadiusKm(d.serviceRadiusKm);
          if (typeof d.installments === "number") setInstallments(d.installments);
          if (typeof d.installmentsInterestFree === "boolean") setInstallmentsInterestFree(d.installmentsInterestFree);
          if (d.validityPreset !== undefined) setValidityPreset(d.validityPreset);
          if (typeof d.validityDate === "string" && d.validityDate) {
            const today = todayISO();
            const max = maxValidityISO();
            setValidityDate(d.validityDate > max ? max : d.validityDate < today ? today : d.validityDate);
          }
        }
      }
    } catch { /* ignore */ }
    hydratedRef.current = true;
  }, [open, initialAd]);

  // Rascunho auto-save (apenas quando NÃO for edição)
  const writeDraft = useCallback(() => {
    if (isEditing) return;
    try {
      const d = {
        v: 2, title, kind, priceFrom, priceTo, payments, stock, delivery, description,
        urgencyTag, serviceRadiusKm, installments, installmentsInterestFree,
        validityPreset, validityDate,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch { /* ignore quota */ }
  }, [isEditing, title, kind, priceFrom, priceTo, payments, stock, delivery, description,
      urgencyTag, serviceRadiusKm, installments, installmentsInterestFree, validityPreset, validityDate]);


  useEffect(() => {
    if (!open || !hydratedRef.current || isEditing) return;
    const t = setTimeout(writeDraft, 500);
    return () => clearTimeout(t);
  }, [open, isEditing, writeDraft]);

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      setStep("form");
      setTouched({});
      setSavedId(null);
    }
  }, [open]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      photos.forEach((p) => { if (!p.remote) URL.revokeObjectURL(p.url); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Upload de fotos ----------
  const addFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list);
    setPhotos((prev) => {
      const slots = MAX_PHOTOS - prev.length;
      if (slots <= 0) {
        toast.warning(`Limite de ${MAX_PHOTOS} fotos atingido.`);
        return prev;
      }
      const next: AdPhoto[] = [];
      for (const file of arr.slice(0, slots)) {
        if (!ACCEPTED_IMG.includes(file.type)) {
          toast.error(`"${file.name}" não é uma imagem suportada.`);
          continue;
        }
        if (file.size > MAX_PHOTO_SIZE) {
          toast.error(`"${file.name}" excede 5MB.`);
          continue;
        }
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          url: URL.createObjectURL(file),
        });
      }
      return [...prev, ...next];
    });
  }, []);

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p && !p.remote) URL.revokeObjectURL(p.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  const togglePayment = (id: PaymentMethod) => {
    markTouched("payments");
    setPayments((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleDelivery = (id: DeliveryMode) => {
    markTouched("delivery");
    setDelivery((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const resetForm = () => {
    setTitle(""); setKind("produto");
    photos.forEach((p) => { if (!p.remote) URL.revokeObjectURL(p.url); });
    setPhotos([]); setPriceFrom(""); setPriceTo("");
    setPayments(["pix"]); setStock(""); setDelivery(["retirada"]);
    setDescription(""); setTouched({});
    setUrgencyTag("normal"); setServiceRadiusKm(15);
    setInstallments(1); setInstallmentsInterestFree(true);
    setValidityPreset(7); setValidityDate(addDaysISO(7));
  };

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  const saveDraftManual = () => {
    writeDraft();
    toast.success("Rascunho salvo. Você pode continuar depois.");
  };

  // ---------- Fluxo: form → preview → submit ----------
  const goToPreview = () => {
    // marca tudo como touched para exibir todos os erros
    setTouched({
      title: true, priceFrom: true, priceTo: true, stock: true,
      description: true, payments: true, delivery: true,
    });
    if (!isValid) {
      toast.error("Corrija os campos destacados antes de continuar.");
      return;
    }
    if (!isEditing && costSummary.insufficient) {
      toast.error(`Saldo insuficiente. Necessário ${costSummary.total} moedas (você tem ${coinBalance}).`);
      return;
    }
    setStep("preview");
  };

  const backToForm = () => setStep("form");

  const priceToNum = parseCurrencyBRL(priceTo);
  const priceFromNum = priceFrom ? parseCurrencyBRL(priceFrom) : 0;
  const discountPct = priceFromNum && priceToNum
    ? Math.round(((priceFromNum - priceToNum) / priceFromNum) * 100)
    : 0;

  const doPublish = async () => {
    setSubmitting(true);
    try {
      const { data: sess } = await supabaseExternal.auth.getSession();
      const uid = sess?.session?.user?.id ?? null;
      if (!uid) {
        toast.error("Faça login para publicar.");
        setSubmitting(false);
        return;
      }

      // Cobrança de moedas somente em NOVAS publicações
      if (!isEditing) {
        if (costSummary.baseCost > 0) {
          const spend = await spendCoinsForAction(uid, "publish_extra", `ad:${Date.now()}`);
          if (!spend.ok && spend.reason === "insufficient") {
            setSubmitting(false);
            return;
          }
        }
        if (costSummary.urgentCost > 0) {
          const spendUrg = await spendCoinsForAction(uid, "urgent_neighborhood", `ad-urg:${Date.now()}`);
          if (!spendUrg.ok && spendUrg.reason === "insufficient") {
            toast.error("Saldo insuficiente para alerta de urgência.");
            setSubmitting(false);
            return;
          }
        }
      }


      // Upload apenas das fotos NOVAS; preserva remotas
      const uploadedUrls: string[] = [];
      for (const p of photos) {
        if (p.remote) { uploadedUrls.push(p.url); continue; }
        if (!p.file) continue;
        try {
          const ext = p.file.name.split(".").pop() || "jpg";
          const path = `ads/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabaseExternal.storage
            .from("media")
            .upload(path, p.file, { cacheControl: "3600", upsert: false });
          if (upErr) throw upErr;
          const { data: pub } = supabaseExternal.storage.from("media").getPublicUrl(path);
          if (pub?.publicUrl) uploadedUrls.push(pub.publicUrl);
        } catch (upErr: any) {
          console.warn("[CommercialAd] upload falhou", upErr?.message);
        }
      }

      const expiresAtISO = new Date(`${validityDate}T23:59:59`).toISOString();
      const metadata = {
        ...(initialAd?.metadata || {}),
        ad_kind: kind,
        price_from: priceFromNum || null,
        price_to: priceToNum,
        payments,
        stock: stock ? Number(stock) : null,
        delivery,
        home_service: delivery.includes("domicilio"),
        urgency_tag: urgencyTag,
        service_radius_km: serviceRadiusKm === 0 ? null : serviceRadiusKm,
        installments: installments > 1 ? installments : null,
        installments_interest_free: installments > 1 ? installmentsInterestFree : null,
        valid_until: validityDate,
        expires_at: expiresAtISO,
        photos: uploadedUrls,
        status: "active",
        source: "commercial_ad",
        ...(isEditing
          ? { updated_at: new Date().toISOString(), edit_count: ((initialAd?.metadata as any)?.edit_count ?? 0) + 1 }
          : { published_at: new Date().toISOString() }),
      };

      const row = {
        title: title.trim(),
        content: description.trim(),
        category: defaultCategory,
        author_id: uid,
        type: "ad",
        metadata,
      };

      let finalId: string | null = initialAd?.id ?? null;

      try {
        if (isEditing && initialAd?.id) {
          const { error } = await supabaseExternal
            .from("feed_posts")
            .update({ title: row.title, content: row.content, metadata })
            .eq("id", initialAd.id)
            .eq("author_id", uid);
          if (error) throw error;
        } else {
          const { data, error } = await supabaseExternal
            .from("feed_posts")
            .insert(row)
            .select("id")
            .single();
          if (error) throw error;
          finalId = data?.id ?? null;
        }
      } catch (dbErr: any) {
        console.warn("[CommercialAd] persistência falhou — fallback local.", dbErr?.message);
        const key = "fixxer:commercial_ads:local";
        const prev = JSON.parse(localStorage.getItem(key) || "[]");
        if (isEditing && finalId) {
          const idx = prev.findIndex((x: any) => x.id === finalId);
          if (idx >= 0) prev[idx] = { ...prev[idx], ...row };
          else prev.unshift({ id: finalId, created_at: new Date().toISOString(), ...row });
        } else {
          finalId = `local-${Date.now()}`;
          prev.unshift({ id: finalId, created_at: new Date().toISOString(), ...row });
        }
        localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));
      }

      try {
        window.dispatchEvent(new CustomEvent("fixxer:ad-created", { detail: { id: finalId, row } }));
      } catch { /* ignore */ }

      if (!isEditing) {
        discardDraft();
        try {
          const key = `fixxer:ads:month:${uid}:${new Date().toISOString().slice(0, 7)}`;
          localStorage.setItem(key, String(freeAdsUsed + 1));
          setFreeAdsUsed(freeAdsUsed + 1);
        } catch { /* ignore */ }
      }
      setSavedId(finalId);
      setStep("success");
      onSaved?.(finalId);
    } catch (err: any) {
      console.error("[CommercialAd] submit error", err);
      toast.error(err?.message || "Falha ao publicar anúncio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToFeed = () => {
    onClose();
    resetForm();
    setTimeout(() => navigate({ to: "/feed/lojista" }).catch(() => {}), 60);
  };

  const handleEditAgain = () => {
    setStep("form");
    setSavedId(null);
  };

  const handleCloseAll = () => {
    if (step === "success") resetForm();
    onClose();
  };

  if (!open) return null;

  // ---------------------------- RENDER ----------------------------

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog" aria-modal="true"
      aria-labelledby="commercial-ad-title"
      onClick={handleCloseAll}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0A0A0B] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: "calc(100dvh - 90px)" }}
      >
        {/* HEADER */}
        <header className="sticky top-0 z-50 flex items-start justify-between gap-3 px-5 py-4 border-b border-white/10 bg-[#0A0A0B]/98 backdrop-blur-md">
          <div className="min-w-0 flex items-start gap-3">
            <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center"
              style={{ background: `${theme.hex}20`, border: `1px solid ${theme.hex}55` }}>
              {step === "success"
                ? <CheckCircle2 className="w-5 h-5" style={{ color: theme.hex }} />
                : step === "preview"
                  ? <Eye className="w-5 h-5" style={{ color: theme.hex }} />
                  : <Megaphone className="w-5 h-5" style={{ color: theme.hex }} />}
            </div>
            <div className="min-w-0">
              <h2 id="commercial-ad-title" className="text-[13px] sm:text-sm font-black uppercase tracking-tight text-white leading-tight">
                {step === "success"
                  ? (isEditing ? "✅ Anúncio Atualizado" : "✅ Anúncio Publicado")
                  : step === "preview"
                    ? "👁️ Prévia do Anúncio"
                    : (isEditing ? "✏️ Editar Anúncio Comercial" : "📢 Criar Novo Anúncio Comercial")}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-white/60 mt-0.5 leading-snug">
                {step === "success"
                  ? "Escolha o próximo passo abaixo."
                  : step === "preview"
                    ? "Revise como o anúncio aparecerá no Feed antes de confirmar."
                    : "Divulgue produtos, promoções, serviços com preço fixo, kits ou liquidações no Feed."}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleCloseAll} aria-label="Fechar"
            className="w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto scrollbar-none px-5 py-5 space-y-6">
          {step === "form" && (
            <FormStep
              theme={theme} extraCost={extraCost}
              title={title} setTitle={setTitle}
              kind={kind} setKind={setKind}
              photos={photos} addFiles={addFiles} removePhoto={removePhoto} fileRef={fileRef}
              priceFrom={priceFrom} setPriceFrom={setPriceFrom}
              priceTo={priceTo} setPriceTo={setPriceTo}
              payments={payments} togglePayment={togglePayment}
              stock={stock} setStock={setStock}
              delivery={delivery} toggleDelivery={toggleDelivery}
              description={description} setDescription={setDescription}
              showErr={showErr} markTouched={markTouched}
              isEditing={isEditing}
            />
          )}
          {step === "preview" && (
            <PreviewStep
              theme={theme}
              title={title} description={description}
              kind={kind} photos={photos}
              priceFromNum={priceFromNum} priceToNum={priceToNum} discountPct={discountPct}
              payments={payments} delivery={delivery}
              stock={stock ? Number(stock) : null}
            />
          )}
          {step === "success" && (
            <SuccessStep
              theme={theme} isEditing={isEditing}
              onGoToFeed={handleGoToFeed}
              onEditAgain={handleEditAgain}
              onClose={handleCloseAll}
              savedId={savedId}
            />
          )}
        </div>

        {/* FOOTER */}
        {step !== "success" && (
          <footer className="sticky bottom-0 z-40 border-t border-white/10 bg-[#0A0A0B]/98 backdrop-blur-md px-5 py-3 flex items-center gap-2"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
            {step === "form" ? (
              <>
                {!isEditing && (
                  <button type="button" onClick={saveDraftManual}
                    className="shrink-0 h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold uppercase tracking-tight inline-flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5" /> Rascunho
                  </button>
                )}
                <button type="button" onClick={goToPreview}
                  className="flex-1 h-11 rounded-xl text-[12px] sm:text-[13px] font-black uppercase tracking-wider text-black inline-flex items-center justify-center gap-2 transition-all"
                  style={{ background: theme.hex, boxShadow: `0 0 22px ${theme.hex}55` }}>
                  <Eye className="w-4 h-4" />
                  Ver Prévia
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={backToForm} disabled={submitting}
                  className="shrink-0 h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white text-[11px] font-bold uppercase tracking-tight inline-flex items-center gap-1.5 disabled:opacity-50">
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                </button>
                <button type="button" onClick={doPublish} disabled={submitting}
                  className="flex-1 h-11 rounded-xl text-[12px] sm:text-[13px] font-black uppercase tracking-wider text-black inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-wait"
                  style={{ background: theme.hex, boxShadow: `0 0 22px ${theme.hex}55` }}>
                  <Rocket className="w-4 h-4" />
                  {submitting ? (isEditing ? "Salvando..." : "Publicando...") : (isEditing ? "Salvar Alterações" : "Confirmar e Publicar")}
                </button>
              </>
            )}
          </footer>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-start gap-1.5 text-[11px] text-[#FF3B6B] leading-snug" role="alert">
      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
      <span>{msg}</span>
    </p>
  );
}

interface FormStepProps {
  theme: ReturnType<typeof getCategoryTheme>;
  extraCost: number;
  title: string; setTitle: (v: string) => void;
  kind: AdKind; setKind: (k: AdKind) => void;
  photos: AdPhoto[]; addFiles: (l: FileList | File[]) => void;
  removePhoto: (id: string) => void; fileRef: React.RefObject<HTMLInputElement | null>;
  priceFrom: string; setPriceFrom: (v: string) => void;
  priceTo: string; setPriceTo: (v: string) => void;
  payments: PaymentMethod[]; togglePayment: (p: PaymentMethod) => void;
  stock: string; setStock: (v: string) => void;
  delivery: DeliveryMode[]; toggleDelivery: (d: DeliveryMode) => void;
  description: string; setDescription: (v: string) => void;
  showErr: (f: FieldKey) => string | undefined;
  markTouched: (f: FieldKey) => void;
  isEditing: boolean;
}

function FormStep(p: FormStepProps) {
  const {
    theme, extraCost, title, setTitle, kind, setKind, photos, addFiles, removePhoto, fileRef,
    priceFrom, setPriceFrom, priceTo, setPriceTo, payments, togglePayment,
    stock, setStock, delivery, toggleDelivery, description, setDescription,
    showErr, markTouched, isEditing,
  } = p;

  const errClass = (f: FieldKey, base: string) =>
    showErr(f) ? base + " border-[#FF3B6B]/70 focus:border-[#FF3B6B]" : base;

  return (
    <>
      {/* 1. TÍTULO */}
      <section className="space-y-2">
        <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
          Título do Anúncio <span className="text-[#FF3B6B]">*</span>
        </label>
        <input
          type="text" value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => markTouched("title")}
          placeholder="Ex: Kit Furadeira Bosch Professional 12V + Maleta em Promoção"
          maxLength={120}
          aria-invalid={!!showErr("title")}
          className={errClass("title", "w-full bg-[#111112] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/60 transition-colors")}
        />
        <div className="flex items-center justify-between">
          <FieldError msg={showErr("title")} />
          <p className="text-[10px] text-white/40 text-right ml-auto">{title.length}/120</p>
        </div>
      </section>

      {/* 2. TIPO */}
      <section className="space-y-2">
        <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
          Tipo de Anúncio / Condição Comercial <span className="text-[#FF3B6B]">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {AD_KINDS.map((k) => {
            const active = kind === k.id;
            return (
              <button key={k.id} type="button" onClick={() => setKind(k.id)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all"
                style={{
                  borderColor: active ? k.color : "rgba(255,255,255,0.1)",
                  background: active ? `${k.color}18` : "#111112",
                  boxShadow: active ? `0 0 12px ${k.color}30` : "none",
                }}>
                <span className="text-lg shrink-0" aria-hidden>{k.icon}</span>
                <span className="text-[11px] font-bold uppercase tracking-tight leading-tight min-w-0"
                  style={{ color: active ? k.color : "rgba(255,255,255,0.8)" }}>
                  {k.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. FOTOS */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
            Fotos do Produto / Oferta
          </label>
          <span className="text-[10px] text-white/50">{photos.length}/{MAX_PHOTOS}</span>
        </div>
        <input ref={fileRef} type="file" accept={ACCEPTED_IMG.join(",")} multiple hidden
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); if (fileRef.current) fileRef.current.value = ""; }} />

        {photos.length < MAX_PHOTOS && (
          <button type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) addFiles(e.dataTransfer.files); }}
            className="w-full py-6 rounded-2xl border-2 border-dashed border-white/15 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center gap-2 text-white/60">
            <Upload className="w-5 h-5" style={{ color: theme.hex }} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Adicionar / Arrastar Fotos</span>
            <span className="text-[10px] text-white/40">JPG, PNG, WEBP ou AVIF — até 5MB cada</span>
          </button>
        )}

        {photos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {photos.map((ph) => (
              <div key={ph.id} className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 group">
                <img src={ph.url} alt="Prévia da foto do anúncio" loading="lazy" decoding="async"
                  className="w-full h-full object-cover" />
                <button type="button" onClick={() => removePhoto(ph.id)} aria-label="Remover foto"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white opacity-90 hover:bg-red-500/80 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. PREÇOS */}
      <section className="space-y-3">
        <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
          Preço e Condição de Pagamento
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
              Preço De <span className="normal-case font-normal text-white/40">(opcional)</span>
            </span>
            <input type="text" inputMode="numeric" value={priceFrom}
              onChange={(e) => setPriceFrom(maskCurrencyBRL(e.target.value))}
              onBlur={() => markTouched("priceFrom")}
              onKeyDown={currencyKeyDown} onFocus={currencyFocusSelect}
              onPaste={currencyPaste(setPriceFrom)}
              placeholder="R$ 0,00"
              aria-invalid={!!showErr("priceFrom")}
              className={errClass("priceFrom", "w-full bg-[#111112] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder:text-white/30 outline-none focus:border-white/30 line-through decoration-white/50")}
            />
            <FieldError msg={showErr("priceFrom")} />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.hex }}>
              Preço Por <span className="text-[#FF3B6B]">*</span>
            </span>
            <input type="text" inputMode="numeric" value={priceTo}
              onChange={(e) => setPriceTo(maskCurrencyBRL(e.target.value))}
              onBlur={() => markTouched("priceTo")}
              onKeyDown={currencyKeyDown} onFocus={currencyFocusSelect}
              onPaste={currencyPaste(setPriceTo)}
              placeholder="R$ 0,00"
              aria-invalid={!!showErr("priceTo")}
              className={errClass("priceTo", "w-full bg-[#111112] border-2 rounded-xl px-3 py-2.5 text-base font-black outline-none transition-colors")}
              style={{ borderColor: showErr("priceTo") ? "#FF3B6B" : `${theme.hex}55`, color: theme.hex, boxShadow: `0 0 10px ${theme.hex}22` }}
            />
            <FieldError msg={showErr("priceTo")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Formas de Aceite</span>
          <div className="flex flex-wrap gap-2">
            {PAYMENTS.map((pm) => {
              const active = payments.includes(pm.id);
              return (
                <button key={pm.id} type="button" onClick={() => togglePayment(pm.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[11px] font-bold uppercase tracking-tight transition-all"
                  style={{
                    borderColor: active ? theme.hex : "rgba(255,255,255,0.15)",
                    background: active ? `${theme.hex}15` : "#111112",
                    color: active ? theme.hex : "rgba(255,255,255,0.75)",
                  }}>
                  <span aria-hidden>{pm.icon}</span> {pm.label}
                </button>
              );
            })}
          </div>
          <FieldError msg={showErr("payments")} />
        </div>
      </section>

      {/* 5. ESTOQUE */}
      <section className="space-y-2">
        <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
          Estoque / Disponibilidade
        </label>
        <div className="flex items-center gap-2">
          <input type="number" min={0} step={1} inputMode="numeric" value={stock}
            onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => markTouched("stock")}
            placeholder="Ex: 10"
            aria-invalid={!!showErr("stock")}
            className={errClass("stock", "w-32 bg-[#111112] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/60")}
          />
          <span className="text-[11px] text-white/50">unidades / vagas disponíveis (opcional)</span>
        </div>
        <FieldError msg={showErr("stock")} />
      </section>

      {/* 6. ENTREGA */}
      <section className="space-y-2">
        <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
          Modalidade de Entrega / Atendimento <span className="text-[#FF3B6B]">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DELIVERY.map((d) => {
            const active = delivery.includes(d.id);
            return (
              <button key={d.id} type="button" onClick={() => toggleDelivery(d.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[11px] font-bold uppercase tracking-tight transition-all"
                style={{
                  borderColor: active ? theme.hex : "rgba(255,255,255,0.15)",
                  background: active ? `${theme.hex}15` : "#111112",
                  color: active ? theme.hex : "rgba(255,255,255,0.75)",
                }}>
                <span aria-hidden>{d.icon}</span> {d.label}
              </button>
            );
          })}
        </div>
        <FieldError msg={showErr("delivery")} />
      </section>

      {/* 7. DESCRIÇÃO */}
      <section className="space-y-2">
        <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
          Descrição Detalhada do Anúncio <span className="text-[#FF3B6B]">*</span>
        </label>
        <textarea value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => markTouched("description")}
          placeholder="Especificações técnicas, garantia, marcas incluídas, diferenciais, prazo de entrega, condições da promoção…"
          rows={5} maxLength={1200}
          aria-invalid={!!showErr("description")}
          className={errClass("description", "w-full bg-[#111112] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/60 resize-none leading-relaxed")}
        />
        <div className="flex items-center justify-between">
          <FieldError msg={showErr("description")} />
          <p className="text-[10px] text-white/40 text-right ml-auto">{description.length}/1200 (mín. 20)</p>
        </div>
      </section>

      {/* FRANQUIA */}
      <div className="rounded-2xl border p-3 flex items-start gap-2"
        style={{ background: `${theme.hex}0D`, borderColor: `${theme.hex}33` }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: theme.hex }} />
        <p className="text-[11px] text-white/75 leading-relaxed">
          <strong className="text-white">{isEditing ? "Edição sem custos:" : "Franquia do seu plano:"}</strong>{" "}
          {isEditing
            ? "Alterações não consomem sua franquia mensal. Refere-se à mesma publicação."
            : <>1 publicação grátis disponível ou <strong className="text-[#FFB020]">{extraCost} 🪙</strong> por excedente. Validade: até <strong>15 dias</strong> no feed.</>}
        </p>
      </div>
    </>
  );
}

// ----- PREVIEW -----

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PreviewStep(props: {
  theme: ReturnType<typeof getCategoryTheme>;
  title: string; description: string;
  kind: AdKind; photos: AdPhoto[];
  priceFromNum: number; priceToNum: number; discountPct: number;
  payments: PaymentMethod[]; delivery: DeliveryMode[];
  stock: number | null;
}) {
  const { theme, title, description, kind, photos, priceFromNum, priceToNum, discountPct, payments, delivery, stock } = props;
  const kindMeta = AD_KINDS.find((k) => k.id === kind);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0E0E10]">
        {/* Galeria de fotos */}
        {photos.length > 0 ? (
          <div className="w-full aspect-[16/10] bg-black/50 relative">
            <img src={photos[0].url} alt="Foto principal" className="w-full h-full object-cover" />
            {photos.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md rounded-full px-2 py-0.5 text-[10px] font-bold text-white">
                +{photos.length - 1} foto{photos.length - 1 > 1 ? "s" : ""}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full aspect-[16/10] bg-black/50 flex items-center justify-center text-white/30 text-[11px]">
            Sem fotos anexadas
          </div>
        )}

        {photos.length > 1 && (
          <div className="flex gap-1.5 p-2 overflow-x-auto scrollbar-none">
            {photos.slice(1).map((p) => (
              <img key={p.id} src={p.url} alt="Miniatura"
                className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0" />
            ))}
          </div>
        )}

        <div className="p-4 space-y-3">
          {kindMeta && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
              style={{ background: `${kindMeta.color}20`, color: kindMeta.color, border: `1px solid ${kindMeta.color}55` }}>
              <span aria-hidden>{kindMeta.icon}</span> {kindMeta.label}
            </span>
          )}
          <h3 className="text-base sm:text-lg font-black text-white leading-tight">{title || "—"}</h3>

          <div className="flex items-end gap-3 flex-wrap">
            {priceFromNum > 0 && (
              <span className="text-sm text-white/50 line-through">{fmtBRL(priceFromNum)}</span>
            )}
            <span className="text-2xl font-black" style={{ color: theme.hex }}>
              {priceToNum > 0 ? fmtBRL(priceToNum) : "—"}
            </span>
            {discountPct > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black text-black"
                style={{ background: "#39FF88" }}>
                -{discountPct}%
              </span>
            )}
          </div>

          {stock != null && (
            <p className="text-[11px] text-white/60">
              <strong className="text-white/90">{stock}</strong> unidades disponíveis
            </p>
          )}

          {description && (
            <p className="text-[12px] text-white/75 leading-relaxed whitespace-pre-wrap">{description}</p>
          )}

          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
            {payments.map((pid) => {
              const meta = PAYMENTS.find((p) => p.id === pid);
              if (!meta) return null;
              return (
                <span key={pid} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-white/80 bg-white/5 border border-white/10">
                  <span aria-hidden>{meta.icon}</span> {meta.label}
                </span>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {delivery.map((did) => {
              const meta = DELIVERY.find((d) => d.id === did);
              if (!meta) return null;
              return (
                <span key={did} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-white/80 bg-white/5 border border-white/10">
                  <span aria-hidden>{meta.icon}</span> {meta.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-white/70 leading-relaxed">
        <Info className="w-3.5 h-3.5 inline mr-1 -mt-0.5" style={{ color: theme.hex }} />
        Confira todos os detalhes acima. Se algo estiver errado, toque em <strong className="text-white">Voltar</strong> para ajustar.
      </div>
    </div>
  );
}

// ----- SUCESSO -----

function SuccessStep(props: {
  theme: ReturnType<typeof getCategoryTheme>;
  isEditing: boolean;
  onGoToFeed: () => void;
  onEditAgain: () => void;
  onClose: () => void;
  savedId: string | null;
}) {
  const { theme, isEditing, onGoToFeed, onEditAgain, onClose, savedId } = props;
  return (
    <div className="py-4 text-center space-y-5">
      <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
        style={{ background: `${theme.hex}20`, border: `2px solid ${theme.hex}` }}>
        <CheckCircle2 className="w-10 h-10" style={{ color: theme.hex }} />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-black text-white uppercase tracking-tight">
          {isEditing ? "Alterações salvas!" : "Publicado com sucesso!"}
        </h3>
        <p className="text-[12px] text-white/60 leading-snug px-4">
          {isEditing
            ? "Seu anúncio foi atualizado no Feed. As mudanças já estão visíveis para os usuários."
            : "Seu anúncio agora está no Feed e visível para todos os usuários compatíveis."}
        </p>
        {savedId && (
          <p className="text-[10px] text-white/30 mt-2 font-mono">ID: {savedId}</p>
        )}
      </div>

      <div className="grid gap-2 pt-2">
        <button type="button" onClick={onGoToFeed}
          className="h-11 rounded-xl text-[12px] font-black uppercase tracking-wider text-black inline-flex items-center justify-center gap-2 transition-all"
          style={{ background: theme.hex, boxShadow: `0 0 22px ${theme.hex}55` }}>
          <Eye className="w-4 h-4" /> Ver no Feed
        </button>
        <button type="button" onClick={onEditAgain}
          className="h-11 rounded-xl bg-white/5 border border-white/15 text-white/90 hover:text-white text-[12px] font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2">
          <Pencil className="w-4 h-4" /> Voltar e Editar
        </button>
        <button type="button" onClick={onClose}
          className="h-10 rounded-xl text-[11px] font-bold uppercase tracking-tight text-white/60 hover:text-white/90">
          Fechar
        </button>
      </div>
    </div>
  );
}
