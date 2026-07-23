import { useState, useRef, useMemo, useEffect } from "react";
import { X, Upload, Trash2, ImagePlus, ArrowUp, ArrowDown, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getCategoryTheme, CATEGORY_LABEL, type CategoryKey } from "@/lib/category-colors";

interface CreateAdModalProps {
  open: boolean;
  onClose: () => void;
  defaultCategory?: CategoryKey;
}

type PriceType = "fixo" | "contrato" | "comissao";

interface UploadItem {
  id: string;
  file: File;
  url: string;
  progress: number; // 0-100 (progresso simulado de leitura local)
  error?: string;
}

const CATEGORIES: CategoryKey[] = ["lojista", "prestador", "fornecedor", "cliente"];
const MAX_IMAGES = 6;
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const formatBRL = (v: string) => {
  const n = Number(v);
  if (!v || Number.isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export function CreateAdModal({ open, onClose, defaultCategory = "lojista" }: CreateAdModalProps) {
  const [category, setCategory] = useState<CategoryKey>(defaultCategory);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [specs, setSpecs] = useState("");
  const [priceType, setPriceType] = useState<PriceType>("fixo");
  const [fixedValue, setFixedValue] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [commission, setCommission] = useState("");
  const [images, setImages] = useState<UploadItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const theme = getCategoryTheme(category);

  // limpa object URLs ao desmontar
  useEffect(() => {
    return () => {
      images.forEach((i) => URL.revokeObjectURL(i.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  

  const simulateProgress = (id: string) => {
    let p = 0;
    const tick = () => {
      p += 20 + Math.random() * 20;
      setImages((prev) =>
        prev.map((i) => (i.id === id ? { ...i, progress: Math.min(100, p) } : i)),
      );
      if (p < 100) setTimeout(tick, 120);
    };
    setTimeout(tick, 60);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.warning(`Máximo de ${MAX_IMAGES} imagens atingido.`);
      return;
    }
    const incoming = Array.from(files);
    const toAdd: UploadItem[] = [];
    let rejectedType = 0;
    let rejectedSize = 0;
    let rejectedLimit = 0;

    for (const file of incoming) {
      if (toAdd.length >= remaining) {
        rejectedLimit++;
        continue;
      }
      if (!ACCEPTED.includes(file.type)) {
        rejectedType++;
        continue;
      }
      if (file.size > MAX_SIZE) {
        rejectedSize++;
        continue;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      toAdd.push({ id, file, url: URL.createObjectURL(file), progress: 0 });
    }

    if (toAdd.length) {
      setImages((prev) => [...prev, ...toAdd]);
      toAdd.forEach((i) => simulateProgress(i.id));
    }
    if (rejectedType) toast.error(`${rejectedType} arquivo(s) rejeitado(s): formato inválido.`);
    if (rejectedSize) toast.error(`${rejectedSize} arquivo(s) acima de 5MB.`);
    if (rejectedLimit) toast.warning(`${rejectedLimit} arquivo(s) excederam o limite de ${MAX_IMAGES}.`);

    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.id !== id);
    });
  };

  const moveImage = (id: string, dir: -1 | 1) => {
    setImages((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  const resetForm = () => {
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
    setTitle("");
    setDescription("");
    setSpecs("");
    setFixedValue("");
    setContractValue("");
    setCommission("");
    setPriceType("fixo");
  };

  const validate = (): string | null => {
    if (!title.trim()) return "Informe o título do anúncio.";
    if (!description.trim()) return "Descreva o anúncio.";
    if (priceType === "fixo") {
      const n = Number(fixedValue);
      if (!fixedValue || Number.isNaN(n) || n <= 0) return "Informe um valor fixo válido (> 0).";
    }
    if (priceType === "contrato") {
      const n = Number(contractValue);
      if (!contractValue || Number.isNaN(n) || n <= 0) return "Informe um valor de contrato válido (> 0).";
    }
    if (priceType === "comissao") {
      const n = Number(commission);
      if (!commission || Number.isNaN(n) || n <= 0 || n > 100)
        return "Informe uma comissão válida (entre 0 e 100).";
    }
    if (images.some((i) => i.progress < 100)) return "Aguarde o processamento das imagens.";
    return null;
  };

  const priceDisplay = useMemo(() => {
    if (priceType === "fixo") return formatBRL(fixedValue);
    if (priceType === "contrato") return `Contrato: ${formatBRL(contractValue)}`;
    if (priceType === "comissao") return `Comissão: ${commission || 0}%`;
    return "";
  }, [priceType, fixedValue, contractValue, commission]);

  if (!open) return null;

  const buildPayload = () => {
    const base = {
      category,
      title: title.trim(),
      description: description.trim(),
      specs: specs.trim() || null,
      price_type: priceType,
      images: images.map((i, order) => ({ name: i.file.name, size: i.file.size, order })),
    };
    // Apenas o campo relevante para o tipo escolhido
    if (priceType === "fixo") return { ...base, fixed_value: Number(fixedValue) };
    if (priceType === "contrato") return { ...base, contract_value: Number(contractValue) };
    return { ...base, commission_percent: Number(commission) };
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
      // TODO: integrar com Supabase (tabela `listings` + upload no bucket `media`).
      console.log("[CreateAdModal] payload =>", payload);
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Anúncio criado com sucesso!");
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao criar anúncio.");
    } finally {
      setSubmitting(false);
    }
  };

  // --------- PRÉVIA (CARD) ---------
  const PreviewCard = (
    <div
      className="rounded-2xl overflow-hidden border bg-[#0F0F10]"
      style={{ borderColor: `rgba(${theme.rgb}, 0.35)`, ...theme.glow }}
    >
      {images[0] ? (
        <div className="relative aspect-video bg-black">
          <img src={images[0].url} alt="preview" className="w-full h-full object-cover" />
          {images.length > 1 && (
            <div className="absolute bottom-2 left-2 flex gap-1">
              {images.slice(0, 6).map((img, i) => (
                <div
                  key={img.id}
                  className={`w-8 h-8 rounded-md overflow-hidden border ${
                    i === 0 ? "border-white" : "border-white/20"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
          <div
            className="absolute top-2 right-2 px-2 py-1 rounded-md text-[9px] uppercase font-black italic"
            style={{ ...theme.bgSoft, color: theme.hex }}
          >
            {CATEGORY_LABEL[category]}
          </div>
        </div>
      ) : (
        <div
          className="aspect-video flex items-center justify-center text-white/30 text-xs uppercase font-bold"
          style={{ background: `rgba(${theme.rgb}, 0.06)` }}
        >
          Sem imagem
        </div>
      )}
      <div className="p-4 space-y-2">
        <h3 className="text-white font-black text-base leading-tight line-clamp-2">
          {title || "Título do anúncio"}
        </h3>
        <p className="text-white/60 text-xs line-clamp-3">
          {description || "Descrição do anúncio aparecerá aqui..."}
        </p>
        {specs.trim() && (
          <div
            className="text-[10px] uppercase font-bold px-2 py-1 rounded"
            style={{ ...theme.bgSoft, color: theme.hex }}
          >
            Specs: {specs.slice(0, 60)}
            {specs.length > 60 ? "..." : ""}
          </div>
        )}
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

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-5xl max-h-[92vh] overflow-y-auto bg-[#0A0A0B] border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl"
        style={theme.glow}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0A0A0B]/95 backdrop-blur"
          style={{ borderColor: `rgba(${theme.rgb}, 0.25)` }}
        >
          <div>
            <h2 className="text-lg font-black uppercase italic text-white tracking-tight">
              Criar Anúncio
            </h2>
            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: theme.hex }}>
              {CATEGORY_LABEL[category]}
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

        <div className="grid lg:grid-cols-[1fr_360px] gap-0">
          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className={`p-5 space-y-5 ${showPreviewMobile ? "hidden lg:block" : ""}`}
          >
            {/* Categoria */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                Categoria
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {CATEGORIES.map((c) => {
                  const t = getCategoryTheme(c);
                  const active = c === category;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className="px-3 py-2.5 rounded-xl border text-[11px] uppercase font-black italic tracking-wide transition"
                      style={
                        active
                          ? { ...t.bgSoft, ...t.borderStrong, color: t.hex, ...t.glow }
                          : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }
                      }
                    >
                      {CATEGORY_LABEL[c]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                Título
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Manutenção de ar-condicionado residencial"
                maxLength={100}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-[9px] text-white/40 text-right">{title.length}/100</p>
            </div>

            {/* Imagens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                  Imagens ({images.length}/{MAX_IMAGES})
                </Label>
                <span className="text-[9px] text-white/40 uppercase font-bold">
                  JPG, PNG, WEBP · máx 5MB
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5 group"
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />

                    {/* progresso / erro */}
                    {img.progress < 100 && !img.error && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${img.progress}%`, background: theme.hex }}
                        />
                      </div>
                    )}
                    {img.error && (
                      <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center text-white text-[9px] text-center p-1">
                        <AlertCircle className="w-4 h-4 mb-1" />
                        {img.error}
                      </div>
                    )}

                    {/* badge ordem */}
                    <div
                      className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-black"
                      style={{ background: theme.hex }}
                    >
                      {idx + 1}
                    </div>

                    {/* remover */}
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-red-500 transition"
                      aria-label="Remover imagem"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    {/* mover */}
                    <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => moveImage(img.id, -1)}
                        disabled={idx === 0}
                        className="w-5 h-5 rounded bg-black/70 flex items-center justify-center text-white disabled:opacity-30"
                        aria-label="Mover para trás"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(img.id, 1)}
                        disabled={idx === images.length - 1}
                        className="w-5 h-5 rounded bg-black/70 flex items-center justify-center text-white disabled:opacity-30"
                        aria-label="Mover para frente"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
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
                accept={ACCEPTED.join(",")}
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
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "fixo", label: "Valor Fixo" },
                    { id: "contrato", label: "Contrato" },
                    { id: "comissao", label: "Comissão %" },
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
                          : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campos de preço condicionais */}
            {priceType === "fixo" && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                  Valor Fixo (R$)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fixedValue}
                  onChange={(e) => setFixedValue(e.target.value)}
                  placeholder="0,00"
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-[9px] text-white/40">Valor único cobrado pelo item/serviço.</p>
              </div>
            )}
            {priceType === "contrato" && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                  Valor do Contrato (R$)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  placeholder="0,00"
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-[9px] text-white/40">Valor total previsto para o contrato.</p>
              </div>
            )}
            {priceType === "comissao" && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                  Percentual de Comissão (%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="Ex.: 10"
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-[9px] text-white/40">Percentual aplicado sobre cada venda/fechamento.</p>
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
                placeholder="Descreva seu serviço, produto ou necessidade..."
                rows={4}
                maxLength={1000}
                className="bg-white/5 border-white/10 text-white resize-none"
              />
              <p className="text-[9px] text-white/40 text-right">{description.length}/1000</p>
            </div>

            {/* Especificações */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
                Especificações Técnicas
              </Label>
              <Textarea
                value={specs}
                onChange={(e) => setSpecs(e.target.value)}
                placeholder="Detalhes técnicos, dimensões, materiais, prazos..."
                rows={3}
                maxLength={800}
                className="bg-white/5 border-white/10 text-white resize-none"
              />
              <p className="text-[9px] text-white/40 text-right">{specs.length}/800</p>
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
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
                {submitting ? "Publicando..." : "Publicar Anúncio"}
              </Button>
            </div>
          </form>

          {/* PRÉVIA (desktop sempre visível, mobile via toggle) */}
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
    </div>
  );
}
