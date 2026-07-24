import type { Appointment, AppointmentEvent } from "@/lib/appointments";
import { APPOINTMENT_STATUS, APPOINTMENT_TYPES } from "@/lib/appointments";
import type { AppointmentDispute } from "@/lib/appointment-disputes";
import { DISPUTE_STATUS_LABEL, DISPUTE_ACTION_LABEL } from "@/lib/appointment-disputes";

const BRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

const DT = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

function humanizeEvent(type: string): string {
  const map: Record<string, string> = {
    created: "Compromisso criado",
    accepted: "Compromisso aceito",
    rescheduled: "Reagendamento proposto",
    checked_in: "Check-in realizado",
    checked_out: "Check-out concluído",
    cancelled: "Compromisso cancelado",
    escrow_released: "Custódia liberada ao prestador",
    escrow_refunded: "Custódia reembolsada ao cliente",
    photos_updated: "Fotos atualizadas",
    dispute_opened: "Contestação aberta",
    dispute_under_review: "Contestação em análise",
    dispute_approved: "Contestação aprovada",
    dispute_rejected: "Contestação rejeitada",
    dispute_resolved: "Contestação resolvida",
  };
  return map[type] ?? type;
}

export type RefundSummary = {
  deposit: number;
  released: number;
  refunded: number;
  net: number;
  lastEvent?: AppointmentEvent;
};

export function summarizeRefund(apt: Appointment, events: AppointmentEvent[]): RefundSummary {
  let released = 0;
  let refunded = 0;
  let last: AppointmentEvent | undefined;
  for (const e of events) {
    const amt = Number(e.metadata?.amount ?? e.metadata?.refund_amount ?? apt.deposit_amount ?? 0);
    if (e.event_type === "escrow_released") { released += amt; last = e; }
    if (e.event_type === "escrow_refunded") { refunded += amt; last = e; }
  }
  return {
    deposit: apt.deposit_amount ?? 0,
    released,
    refunded,
    net: (apt.deposit_amount ?? 0) - refunded - released,
    lastEvent: last,
  };
}

export async function generateAppointmentPdf(
  apt: Appointment,
  events: AppointmentEvent[],
  disputes: AppointmentDispute[],
): Promise<Blob> {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableModule as any).default ?? (autoTableModule as any);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = 50;

  // Header
  doc.setFillColor(10, 10, 11);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(0, 229, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("FIXXER", M, 42);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Historico Completo do Compromisso", M, 58);
  doc.setTextColor(160, 160, 160);
  doc.setFontSize(8);
  doc.text(`Emitido em ${DT(new Date().toISOString())}`, W - M, 58, { align: "right" });

  y = 100;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const t = APPOINTMENT_TYPES[apt.type];
  doc.text(`${t?.label ?? apt.type}`, M, y);
  y += 16;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Protocolo #${apt.id}`, M, y);
  y += 20;

  // Bloco de detalhes
  const status = APPOINTMENT_STATUS[apt.status];
  const details: Array<[string, string]> = [
    ["Status", `${status?.label ?? apt.status}`],
    ["Data agendada", DT(apt.scheduled_at)],
    ["Duracao prevista", `${apt.duration_min} min`],
    ["Endereco", apt.location_address ?? "-"],
    ["Coordenadas", apt.location_lat && apt.location_lng
      ? `${apt.location_lat.toFixed(5)}, ${apt.location_lng.toFixed(5)}` : "-"],
    ["Check-in em", apt.checkin_at ? DT(apt.checkin_at) : "-"],
    ["Check-out em", apt.checkout_at ? DT(apt.checkout_at) : "-"],
    ["Fotos check-in", `${apt.checkin_photos?.length ?? 0}`],
    ["Fotos check-out", `${apt.checkout_photos?.length ?? 0}`],
    ["Criado em", DT(apt.created_at)],
    ["Ultima atualizacao", DT(apt.updated_at)],
    ["Motivo do cancelamento", apt.cancel_reason ?? "-"],
    ["Observacoes", apt.notes ?? "-"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Campo", "Valor"]],
    body: details,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5, textColor: [30, 30, 30] },
    headStyles: { fillColor: [17, 17, 18], textColor: [255, 255, 255] },
    columnStyles: { 0: { cellWidth: 150, fontStyle: "bold" } },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  // Reembolso / Custodia
  const summary = summarizeRefund(apt, events);
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
  doc.text("Custodia e reembolso", M, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["Item", "Valor"]],
    body: [
      ["Sinal depositado em custodia", BRL(summary.deposit)],
      ["Liberado ao prestador", BRL(summary.released)],
      ["Reembolsado ao cliente", BRL(summary.refunded)],
      ["Saldo em custodia", BRL(Math.max(0, summary.net))],
      ["Ultimo evento financeiro", summary.lastEvent
        ? `${humanizeEvent(summary.lastEvent.event_type)} em ${DT(summary.lastEvent.created_at)}`
        : "-"],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [0, 255, 135], textColor: [10, 10, 11] },
    columnStyles: { 0: { cellWidth: 220, fontStyle: "bold" }, 1: { halign: "right" } },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  // Timeline
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Linha do tempo", M, y);
  y += 8;

  const timelineRows = [...events]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((e) => [
      DT(e.created_at),
      humanizeEvent(e.event_type),
      e.metadata ? JSON.stringify(e.metadata) : "-",
    ]);
  if (timelineRows.length === 0) timelineRows.push(["-", "Sem eventos registrados", "-"]);

  autoTable(doc, {
    startY: y,
    head: [["Quando", "Evento", "Detalhes"]],
    body: timelineRows,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [0, 229, 255], textColor: [10, 10, 11] },
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 160, fontStyle: "bold" } },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  // Contestacoes
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Contestacoes / Recursos", M, y);
  y += 8;

  const disputeRows = disputes.map((d) => [
    DT(d.created_at),
    DISPUTE_STATUS_LABEL[d.status].label,
    DISPUTE_ACTION_LABEL[d.requested_action],
    d.refund_amount != null ? BRL(Number(d.refund_amount)) : "-",
    d.reason,
    d.admin_notes ?? "-",
  ]);
  if (disputeRows.length === 0) disputeRows.push(["-", "Nenhuma contestacao registrada", "-", "-", "-", "-"]);

  autoTable(doc, {
    startY: y,
    head: [["Aberta em", "Status", "Acao", "Valor", "Motivo", "Notas do admin"]],
    body: disputeRows,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [255, 159, 10], textColor: [10, 10, 11] },
    columnStyles: {
      0: { cellWidth: 80 }, 1: { cellWidth: 70 }, 2: { cellWidth: 90 },
      3: { cellWidth: 60, halign: "right" },
    },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  // Evidencias anexadas
  const allEvidence = disputes.flatMap((d) =>
    (d.evidence_urls ?? []).map((url) => ({ url, disputeId: d.id.slice(0, 8) })),
  );
  if (allEvidence.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 120) { doc.addPage(); y = 60; }
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
    doc.text("Evidencias anexadas", M, y);
    y += 12;
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
    for (const ev of allEvidence) {
      if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 60; }
      doc.setTextColor(0, 100, 200);
      doc.textWithLink(`- Disputa ${ev.disputeId}: ${ev.url}`, M, y, { url: ev.url });
      y += 12;
    }
    y += 8;
  }

  // Rodape em todas as paginas
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setTextColor(140, 140, 140);
    doc.text(
      `FIXXER — Documento gerado eletronicamente. Protocolo ${apt.id.slice(0, 12)} — pag. ${p}/${pages}`,
      W / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  return doc.output("blob");
}

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
