import { useState } from "react";
import { Megaphone, ClipboardList, X, Info } from "lucide-react";
import { CreateAdModal } from "@/components/CreateAdModal";
import { CommercialAdModal } from "@/components/CommercialAdModal";
import type { CategoryKey } from "@/lib/category-colors";
import { getActionCost } from "@/lib/monetization";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultCategory: CategoryKey;
}

type PublishKind = "ad" | "request";

/**
 * Modal "PUBLICAR" — o usuário escolhe entre:
 *  📢 Criar Anúncio         → vendas/promoções (ad_kind: "offer")
 *  📋 Criar Solicitação     → cotação/contratação (ad_kind: "request")
 *
 * Ambas as opções abrem o `CreateAdModal` pré-configurado com o modo escolhido.
 * O consumo de moedas por publicação excedente ocorre dentro do próprio modal
 * (chave `publish_extra`) e a franquia grátis vem do plano ativo (`freeAdsMonthly`).
 */
export function PublishPickerModal({ open, onClose, defaultCategory }: Props) {
  const [kind, setKind] = useState<PublishKind | null>(null);
  const extraCost = getActionCost("publish_extra")?.coins ?? 20;

  if (!open) return null;

  if (kind) {
    if (typeof window !== "undefined") {
      try { window.sessionStorage.setItem("fixxer_publish_kind", kind); } catch { /* ignore */ }
    }
    const handleClose = () => { setKind(null); onClose(); };
    // Fluxo 100% separado: "ad" → formulário comercial exclusivo.
    // "request" continua no CreateAdModal (cotação/solicitação de serviço).
    if (kind === "ad") {
      return (
        <CommercialAdModal
          open
          onClose={handleClose}
          defaultCategory={defaultCategory}
        />
      );
    }
    return (
      <CreateAdModal
        open
        onClose={handleClose}
        defaultCategory={defaultCategory}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-[#0A0A0B] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)", maxHeight: "92dvh", overflowY: "auto" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight text-white">Publicar na FIXXER</h2>
            <p className="text-[10px] text-white/50 mt-1">Escolha o tipo de publicação que deseja criar.</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid gap-3">
          <button
            onClick={() => setKind("ad")}
            className="text-left p-4 rounded-2xl bg-[#111112] border border-white/10 hover:border-primary/60 hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-black uppercase text-white">📢 Criar Anúncio</p>
                <p className="text-[11px] text-white/60">Vendas de produtos, promoções, ofertas e prestação de serviços.</p>
              </div>
            </div>
            <p className="text-[10px] text-white/50 mt-2 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              Ideal para usuários que querem DIVULGAR e APARECER no Feed.
            </p>
          </button>

          <button
            onClick={() => setKind("request")}
            className="text-left p-4 rounded-2xl bg-[#111112] border border-white/10 hover:border-primary/60 hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#B084FF]/15 border border-[#B084FF]/30 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-[#B084FF]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-black uppercase text-white">📋 Criar Solicitação</p>
                <p className="text-[11px] text-white/60">Cotações e contratação de serviços/fornecedores.</p>
              </div>
            </div>
            <p className="text-[10px] text-white/50 mt-2 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              Publique uma demanda para receber propostas de prestadores e fornecedores próximos.
            </p>
          </button>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[10px] text-white/60 leading-relaxed">
          <p>
            <strong className="text-white">Franquia grátis</strong> conforme seu plano. Publicações
            excedentes custam <strong className="text-[#FFB020]">{extraCost} 🪙</strong> cada.
          </p>
          <p className="mt-1">
            Validade: <strong className="text-white">até 15 dias</strong> (a publicação expira e é
            ocultada do feed automaticamente). Edição posterior: <strong className="text-white">5 🪙</strong>
            {" "}(máx. 3 edições, com tag <code className="text-white/80">[Editado]</code>).
          </p>
        </div>
      </div>
    </div>
  );
}
