/**
 * Exporta o histórico de uma conversa em CSV ou PDF, com filtro por data
 * e paginação por página (PDF: quebra automática por espaço; CSV: linha por mensagem).
 */
import jsPDF from "jspdf";

export type ExportMessage = {
  id: string;
  created_at: string | null;
  sender_id: string;
  content: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
};

export type ExportOptions = {
  peerName: string;
  selfName: string;
  selfId: string;
  from?: Date | null; // inclusive
  to?: Date | null; // inclusive (fim do dia)
};

function inRange(iso: string | null, from?: Date | null, to?: Date | null) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (from && t < from.getTime()) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (t > end.getTime()) return false;
  }
  return true;
}

function csvEscape(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function filterMessages(msgs: ExportMessage[], opts: ExportOptions) {
  return msgs.filter((m) => inRange(m.created_at, opts.from ?? null, opts.to ?? null));
}

export function buildCsv(msgs: ExportMessage[], opts: ExportOptions): string {
  const rows: string[] = [];
  rows.push(["data_hora", "autor", "mensagem", "anexo_nome", "anexo_url"].join(","));
  for (const m of msgs) {
    const when = m.created_at ? new Date(m.created_at).toLocaleString("pt-BR") : "";
    const who = m.sender_id === opts.selfId ? opts.selfName : opts.peerName;
    const body = (m.content ?? "").replace(/\r?\n/g, " ").trim();
    const att = m.attachment_name || "";
    const url = m.attachment_url || "";
    rows.push([when, who, body, att, url].map(csvEscape).join(","));
  }
  // BOM UTF-8 para Excel reconhecer acentos corretamente
  return "\uFEFF" + rows.join("\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportCsv(msgs: ExportMessage[], opts: ExportOptions) {
  const filtered = filterMessages(msgs, opts);
  const csv = buildCsv(filtered, opts);
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `conversa-${(opts.peerName || "chat").replace(/[^\w-]+/g, "_")}-${stamp}.csv`;
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), name);
  return { count: filtered.length };
}

export function exportPdf(msgs: ExportMessage[], opts: ExportOptions) {
  const filtered = filterMessages(msgs, opts);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxW = pageW - margin * 2;
  let y = margin;

  const addPageHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Conversa com ${opts.peerName}`, margin, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const range =
      opts.from || opts.to
        ? `Periodo: ${opts.from ? opts.from.toLocaleDateString("pt-BR") : "inicio"} ate ${
            opts.to ? opts.to.toLocaleDateString("pt-BR") : "hoje"
          }`
        : "Periodo: completo";
    doc.text(range, margin, y);
    y += 12;
    doc.text(`Exportado em ${new Date().toLocaleString("pt-BR")}`, margin, y);
    y += 14;
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
      addPageHeader();
    }
  };

  const stripAccentsSafe = (s: string) =>
    // jsPDF core fonts (Helvetica) usam WinAnsi; para segurança em caracteres
    // fora do WinAnsi, mantemos o texto mas jsPDF já lida com Latin-1 padrao.
    s.replace(/\r/g, "");

  addPageHeader();

  for (const m of filtered) {
    const when = m.created_at ? new Date(m.created_at).toLocaleString("pt-BR") : "";
    const who = m.sender_id === opts.selfId ? opts.selfName : opts.peerName;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const header = `[${when}] ${who}`;
    ensureSpace(16);
    doc.text(header, margin, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const body = stripAccentsSafe((m.content ?? "").trim() || (m.attachment_url ? "" : "(sem conteudo)"));
    if (body) {
      const lines = doc.splitTextToSize(body, maxW) as string[];
      for (const line of lines) {
        ensureSpace(14);
        doc.text(line, margin, y);
        y += 12;
      }
    }
    if (m.attachment_url) {
      const label = `Anexo: ${m.attachment_name || m.attachment_url}`;
      const lines = doc.splitTextToSize(label, maxW) as string[];
      doc.setTextColor(70, 130, 180);
      for (const line of lines) {
        ensureSpace(14);
        doc.text(line, margin, y);
        y += 12;
      }
      doc.setTextColor(0, 0, 0);
    }
    y += 6;
  }

  // Rodapé com numeração
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Pagina ${i} de ${total}`, pageW - margin, pageH - 20, { align: "right" });
    doc.setTextColor(0);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `conversa-${(opts.peerName || "chat").replace(/[^\w-]+/g, "_")}-${stamp}.pdf`;
  doc.save(name);
  return { count: filtered.length };
}
