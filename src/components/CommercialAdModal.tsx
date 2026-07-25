import { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  X, Upload, Trash2, Megaphone, Tag, Package, Wrench, Truck,
  Store, Globe, CreditCard, Zap, Handshake, Rocket, Info, Save,
} from "lucide-react";
import { toast } from "sonner";
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  getActionCost,
  spendCoinsForAction,
} from "@/lib/monetization";
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

interface CommercialAdModalProps {
  open: boolean;
  onClose: () => void;
  defaultCategory?: CategoryKey;
}

type AdKind = "promo" | "produto" | "pacote" | "atacado";
type PaymentMethod = "cartao" | "pix" | "combinar";
type DeliveryMode = "retirada" | "frete" | "online";

interface AdPhoto {
  id: string;
  file: File;
  url: string;
}

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
  { id: "retirada", label: "Retirada na Loja / Local", icon: "🏬", Icon: Store },
  { id: "frete",    label: "Entrega Própria / Frete",  icon: "🚚", Icon: Truck },
  { id: "online",   label: "Atendimento On-line",       icon: "🌐", Icon: Globe },
];

// =============================================================================
// COMPONENTE
// =============================================================================

export const CommercialAdModal = memo(function CommercialAdModal({
  open,
  onClose,
  defaultCategory = "lojista",
}: CommercialAdModalProps) {
  const theme = getCategoryTheme(defaultCategory);

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

  const fileRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  const extraCost = getActionCost("publish_extra")?.coins ?? 20;

  // ---------- Draft (auto-save leve — só campos de texto/seleção) ----------
  const writeDraft = useCallback(() => {
    try {
      const d = {
        v: 1, title, kind, priceFrom, priceTo,
        payments, stock, delivery, description,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch { /* ignore quota */ }
  }, [title, kind, priceFrom, priceTo, payments, stock, delivery, description]);

  useEffect(() => {
    if (!open) return;
    if (hydratedRef.current) return;
    try {
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
      }
    } catch { /* ignore */ }
    hydratedRef.current = true;
  }, [open]);

  useEffect(() => {
    if (!open || !hydratedRef.current) return;
    const t = setTimeout(writeDraft, 500);
    return () => clearTimeout(t);
  }, [open, writeDraft]);

  useEffect(() => {
    if (!open) hydratedRef.current = false;
  }, [open]);

  // Limpa URLs de object ao desmontar
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
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
      if (p) URL.revokeObjectURL(p.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  const togglePayment = (id: PaymentMethod) =>
    setPayments((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleDelivery = (id: DeliveryMode) =>
    setDelivery((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const resetForm = () => {
    setTitle("");
    setKind("produto");
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setPriceFrom("");
    setPriceTo("");
    setPayments(["pix"]);
    setStock("");
    setDelivery(["retirada"]);
    setDescription("");
  };

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  const saveDraftManual = () => {
    writeDraft();
    toast.success("Rascunho salvo. Você pode continuar depois.");
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return toast.error("Informe o título do anúncio.");
    const priceToVal = parseCurrencyBRL(priceTo);
    if (!priceToVal || priceToVal <= 0) return toast.error("Informe o preço do anúncio (Preço Por).");
    const priceFromVal = priceFrom ? parseCurrencyBRL(priceFrom) : 0;
    if (priceFromVal && priceFromVal <= priceToVal) {
      return toast.error("O Preço De deve ser maior que o Preço Por para indicar desconto.");
    }
    if (payments.length === 0) return toast.error("Selecione ao menos uma forma de pagamento.");
    if (delivery.length === 0) return toast.error("Selecione ao menos uma modalidade de entrega.");
    if (!description.trim() || description.trim().length < 20) {
      return toast.error("Descreva o anúncio com pelo menos 20 caracteres.");
    }

    setSubmitting(true);
    try {
      const { data: sess } = await supabaseExternal.auth.getSession();
      const uid = sess?.session?.user?.id ?? null;
      if (!uid) {
        toast.error("Faça login para publicar.");
        setSubmitting(false);
        return;
      }

      // Cobrança de excedente — a franquia grátis é resolvida no servidor
      // via idempotência (chave por usuário+mês) no MonetizationContext.
      // Se o usuário ainda tem publicação grátis, `publish_extra` não é cobrado.
      // TODO(server): integração com contador mensal de freeAdsMonthly.
      const spend = await spendCoinsForAction(uid, "publish_extra", `ad:${Date.now()}`);
      if (!spend.ok && spend.reason === "insufficient") {
        setSubmitting(false);
        return; // modal de saldo insuficiente já foi disparado globalmente
      }

      // Upload das fotos no bucket público `media`
      const uploadedUrls: string[] = [];
      for (const p of photos) {
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

      const metadata = {
        ad_kind: kind,
        price_from: priceFromVal || null,
        price_to: priceToVal,
        payments,
        stock: stock ? Number(stock) : null,
        delivery,
        photos: uploadedUrls,
        status: "active",
        source: "commercial_ad",
        published_at: new Date().toISOString(),
      };

      const row = {
        title: title.trim(),
        content: description.trim(),
        category: defaultCategory,
        author_id: uid,
        type: "ad",
        metadata,
      };

      let insertedId: string | null = null;
      try {
        const { data, error } = await supabaseExternal
          .from("feed_posts")
          .insert(row)
          .select("id")
          .single();
        if (error) throw error;
        insertedId = data?.id ?? null;
      } catch (dbErr: any) {
        console.warn("[CommercialAd] feed_posts insert falhou — fallback local.", dbErr?.message);
        const key = "fixxer:commercial_ads:local";
        const prev = JSON.parse(localStorage.getItem(key) || "[]");
        insertedId = `local-${Date.now()}`;
        prev.unshift({ id: insertedId, created_at: new Date().toISOString(), ...row });
        localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));
      }

      try {
        window.dispatchEvent(
          new CustomEvent("fixxer:ad-created", {
            detail: { id: insertedId, row },
          }),
        );
      } catch { /* ignore */ }

      toast.success("Anúncio publicado com sucesso!");
      discardDraft();
      resetForm();
      onClose();
    } catch (err: any) {
      console.error("[CommercialAd] submit error", err);
      toast.error(err?.message || "Falha ao publicar anúncio.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="commercial-ad-title"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0A0A0B] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: "calc(100dvh - 90px)" }}
      >
        {/* CABEÇALHO STICKY */}
        <header
          className="sticky top-0 z-50 flex items-start justify-between gap-3 px-5 py-4 border-b border-white/10 bg-[#0A0A0B]/98 backdrop-blur-md"
        >
          <div className="min-w-0 flex items-start gap-3">
            <div
              className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center"
              style={{ background: `${theme.hex}20`, border: `1px solid ${theme.hex}55` }}
            >
              <Megaphone className="w-5 h-5" style={{ color: theme.hex }} />
            </div>
            <div className="min-w-0">
              <h2
                id="commercial-ad-title"
                className="text-[13px] sm:text-sm font-black uppercase tracking-tight text-white leading-tight"
              >
                📢 Criar Novo Anúncio Comercial
              </h2>
              <p className="text-[10px] sm:text-[11px] text-white/60 mt-0.5 leading-snug">
                Divulgue produtos, promoções, serviços com preço fixo, kits ou liquidações no Feed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* CORPO — SCROLL */}
        <div className="flex-1 overflow-y-auto scrollbar-none px-5 py-5 space-y-6">

          {/* 1. TÍTULO */}
          <section className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
              Título do Anúncio <span className="text-[#FF3B6B]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Kit Furadeira Bosch Professional 12V + Maleta em Promoção"
              maxLength={120}
              className="w-full bg-[#111112] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/60 transition-colors"
            />
            <p className="text-[10px] text-white/40 text-right">{title.length}/120</p>
          </section>

          {/* 2. TIPO DE ANÚNCIO */}
          <section className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
              Tipo de Anúncio / Condição Comercial <span className="text-[#FF3B6B]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AD_KINDS.map((k) => {
                const active = kind === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKind(k.id)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all"
                    style={{
                      borderColor: active ? k.color : "rgba(255,255,255,0.1)",
                      background: active ? `${k.color}18` : "#111112",
                      boxShadow: active ? `0 0 12px ${k.color}30` : "none",
                    }}
                  >
                    <span className="text-lg shrink-0" aria-hidden>{k.icon}</span>
                    <span
                      className="text-[11px] font-bold uppercase tracking-tight leading-tight min-w-0"
                      style={{ color: active ? k.color : "rgba(255,255,255,0.8)" }}
                    >
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

            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_IMG.join(",")}
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
                }}
                className="w-full py-6 rounded-2xl border-2 border-dashed border-white/15 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center gap-2 text-white/60"
              >
                <Upload className="w-5 h-5" style={{ color: theme.hex }} />
                <span className="text-[11px] font-bold uppercase tracking-widest">
                  Adicionar / Arrastar Fotos
                </span>
                <span className="text-[10px] text-white/40">
                  JPG, PNG, WEBP ou AVIF — até 5MB cada
                </span>
              </button>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 group"
                  >
                    <img
                      src={p.url}
                      alt="Prévia da foto do anúncio"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      aria-label="Remover foto"
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white opacity-90 hover:bg-red-500/80 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4. PREÇO E PAGAMENTO */}
          <section className="space-y-3">
            <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
              Preço e Condição de Pagamento
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Preço De <span className="normal-case font-normal text-white/40">(opcional)</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceFrom}
                  onChange={(e) => setPriceFrom(maskCurrencyBRL(e.target.value))}
                  onKeyDown={currencyKeyDown}
                  onFocus={currencyFocusSelect}
                  onPaste={currencyPaste(setPriceFrom)}
                  placeholder="R$ 0,00"
                  className="w-full bg-[#111112] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder:text-white/30 outline-none focus:border-white/30 line-through decoration-white/50"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.hex }}>
                  Preço Por <span className="text-[#FF3B6B]">*</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceTo}
                  onChange={(e) => setPriceTo(maskCurrencyBRL(e.target.value))}
                  onKeyDown={currencyKeyDown}
                  onFocus={currencyFocusSelect}
                  onPaste={currencyPaste(setPriceTo)}
                  placeholder="R$ 0,00"
                  className="w-full bg-[#111112] border-2 rounded-xl px-3 py-2.5 text-base font-black outline-none transition-colors"
                  style={{ borderColor: `${theme.hex}55`, color: theme.hex, boxShadow: `0 0 10px ${theme.hex}22` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                Formas de Aceite
              </span>
              <div className="flex flex-wrap gap-2">
                {PAYMENTS.map((p) => {
                  const active = payments.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePayment(p.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[11px] font-bold uppercase tracking-tight transition-all"
                      style={{
                        borderColor: active ? theme.hex : "rgba(255,255,255,0.15)",
                        background: active ? `${theme.hex}15` : "#111112",
                        color: active ? theme.hex : "rgba(255,255,255,0.75)",
                      }}
                    >
                      <span aria-hidden>{p.icon}</span>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 5. ESTOQUE */}
          <section className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
              Estoque / Disponibilidade
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Ex: 10"
                className="w-32 bg-[#111112] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/60"
              />
              <span className="text-[11px] text-white/50">
                unidades / vagas disponíveis (opcional)
              </span>
            </div>
          </section>

          {/* 6. MODALIDADE DE ENTREGA */}
          <section className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
              Modalidade de Entrega / Atendimento <span className="text-[#FF3B6B]">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {DELIVERY.map((d) => {
                const active = delivery.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDelivery(d.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[11px] font-bold uppercase tracking-tight transition-all"
                    style={{
                      borderColor: active ? theme.hex : "rgba(255,255,255,0.15)",
                      background: active ? `${theme.hex}15` : "#111112",
                      color: active ? theme.hex : "rgba(255,255,255,0.75)",
                    }}
                  >
                    <span aria-hidden>{d.icon}</span>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 7. DESCRIÇÃO */}
          <section className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-widest text-white/80">
              Descrição Detalhada do Anúncio <span className="text-[#FF3B6B]">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Especificações técnicas, garantia, marcas incluídas, diferenciais, prazo de entrega, condições da promoção…"
              rows={5}
              maxLength={1200}
              className="w-full bg-[#111112] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/60 resize-none leading-relaxed"
            />
            <p className="text-[10px] text-white/40 text-right">
              {description.length}/1200 (mín. 20)
            </p>
          </section>

          {/* FRANQUIA */}
          <div
            className="rounded-2xl border p-3 flex items-start gap-2"
            style={{ background: `${theme.hex}0D`, borderColor: `${theme.hex}33` }}
          >
            <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: theme.hex }} />
            <p className="text-[11px] text-white/75 leading-relaxed">
              <strong className="text-white">Franquia do seu plano:</strong>{" "}
              1 publicação grátis disponível ou{" "}
              <strong className="text-[#FFB020]">{extraCost} 🪙</strong> por excedente.
              Validade: até <strong>15 dias</strong> no feed.
            </p>
          </div>
        </div>

        {/* RODAPÉ STICKY */}
        <footer className="sticky bottom-0 z-40 border-t border-white/10 bg-[#0A0A0B]/98 backdrop-blur-md px-5 py-3 flex items-center gap-2"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
        >
          <button
            type="button"
            onClick={saveDraftManual}
            className="shrink-0 h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold uppercase tracking-tight inline-flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Rascunho
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 h-11 rounded-xl text-[12px] sm:text-[13px] font-black uppercase tracking-wider text-black inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-wait"
            style={{
              background: theme.hex,
              boxShadow: `0 0 22px ${theme.hex}55`,
            }}
          >
            <Rocket className="w-4 h-4" />
            {submitting ? "Publicando..." : "Publicar Anúncio Agora"}
          </button>
        </footer>
      </form>
    </div>
  );
});
