import { useState, useRef } from "react";
import { X, Upload, Trash2, ImagePlus } from "lucide-react";
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

const CATEGORIES: CategoryKey[] = ["lojista", "prestador", "fornecedor", "cliente"];

export function CreateAdModal({ open, onClose, defaultCategory = "lojista" }: CreateAdModalProps) {
  const [category, setCategory] = useState<CategoryKey>(defaultCategory);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [specs, setSpecs] = useState("");
  const [priceType, setPriceType] = useState<PriceType>("fixo");
  const [fixedValue, setFixedValue] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [commission, setCommission] = useState("");
  const [images, setImages] = useState<{ file: File; url: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const theme = getCategoryTheme(category);

  if (!open) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 6 - images.length);
    const mapped = list
      .filter((f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    if (mapped.length < list.length) {
      toast.warning("Alguns arquivos foram ignorados (máx 5MB, apenas imagens).");
    }
    setImages((prev) => [...prev, ...mapped]);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.url);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o título do anúncio.");
      return;
    }
    if (!description.trim()) {
      toast.error("Descreva o anúncio.");
      return;
    }
    if (priceType === "fixo" && !fixedValue) {
      toast.error("Informe o valor fixo.");
      return;
    }
    if (priceType === "contrato" && !contractValue) {
      toast.error("Informe o valor do contrato.");
      return;
    }
    if (priceType === "comissao" && !commission) {
      toast.error("Informe o percentual de comissão.");
      return;
    }

    setSubmitting(true);
    try {
      // TODO: integrar com Supabase (tabela `listings` + upload no bucket `media`).
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

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-2xl max-h-[92vh] overflow-y-auto bg-[#0A0A0B] border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl"
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
            <p className="text-[10px] uppercase font-bold tracking-wider" style={theme.color}>
              {CATEGORY_LABEL[category]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
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
          </div>

          {/* Imagens */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black tracking-wider text-white/70">
              Imagens (até 6)
            </Label>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5"
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-red-500 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < 6 && (
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
              accept="image/*"
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
              className="flex-1 uppercase italic font-black text-xs h-12 border-0"
              style={{ ...theme.bgSolid, ...theme.glowStrong }}
            >
              <Upload className="w-4 h-4 mr-2" />
              {submitting ? "Publicando..." : "Publicar Anúncio"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
