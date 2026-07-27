import { useState } from "react";
import { X, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportCsv, exportPdf, type ExportMessage, type ExportOptions } from "@/lib/chat-export";

interface Props {
  open: boolean;
  onClose: () => void;
  messages: ExportMessage[];
  peerName: string;
  selfName: string;
  selfId: string;
}

export default function ExportChatModal({ open, onClose, messages, peerName, selfName, selfId }: Props) {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const buildOpts = (): ExportOptions => ({
    peerName,
    selfName,
    selfId,
    from: from ? new Date(from + "T00:00:00") : null,
    to: to ? new Date(to + "T00:00:00") : null,
  });

  const preview = (() => {
    const opts = buildOpts();
    return messages.filter((m) => {
      if (!m.created_at) return false;
      const t = new Date(m.created_at).getTime();
      if (opts.from && t < opts.from.getTime()) return false;
      if (opts.to) {
        const end = new Date(opts.to); end.setHours(23,59,59,999);
        if (t > end.getTime()) return false;
      }
      return true;
    }).length;
  })();

  const doExport = async (fmt: "csv" | "pdf") => {
    setBusy(true);
    try {
      const opts = buildOpts();
      const res = fmt === "csv" ? exportCsv(messages, opts) : exportPdf(messages, opts);
      toast.success(`Exportado ${res.count} mensagens em ${fmt.toUpperCase()}`);
      onClose();
    } catch (e: any) {
      toast.error("Falha ao exportar", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-5 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Exportar conversa</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs text-white/60 block mb-1">Data inicial</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 block mb-1">Data final</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="text-xs text-white/60">
            {preview} mensagem{preview === 1 ? "" : "s"} no intervalo selecionado.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => doExport("csv")}
            disabled={busy || preview === 0}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileSpreadsheet className="w-6 h-6" />}
            <span className="text-sm font-semibold">CSV</span>
            <span className="text-[10px] text-white/60">Planilha (Excel)</span>
          </button>
          <button
            onClick={() => doExport("pdf")}
            disabled={busy || preview === 0}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
            <span className="text-sm font-semibold">PDF</span>
            <span className="text-[10px] text-white/60">Paginado com rodapé</span>
          </button>
        </div>
      </div>
    </div>
  );
}
