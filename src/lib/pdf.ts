import { jsPDF } from "jspdf";
import type { SavedSession } from "./sessions";
import { totalSeconds } from "./generate";
import { clockAt, shortDate } from "./time";
import { formatDuration } from "./tracks";
import { planRows } from "./exports";

/** A4 portrait PDF. Note: built-in PDF fonts cover Latin text only. */
export function buildPdf(s: SavedSession): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 18, R = 192;
  let y = 24;
  doc.setFont("helvetica", "bold").setFontSize(24).text("Garba Plan", L, y);
  y += 10;
  doc.setFont("helvetica", "normal").setFontSize(15).text(shortDate(s.session_date), L, y);
  y += 7;
  doc.setFontSize(11).setTextColor(90).text(
    `${s.start_time ? `Start ${clockAt(s.start_time, 0)} · ` : ""}about ${s.target_minutes} min`, L, y);
  doc.setTextColor(0);
  y += 10;
  doc.setDrawColor(150).line(L, y, R, y);
  y += 8;

  for (const r of planRows(s)) {
    if (y > 270) { doc.addPage(); y = 24; }
    doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(90).text(r.at ?? "", L, y);
    doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(0).text(r.label, L + 24, y);
    doc.setFont("helvetica", "normal").setFontSize(13).text(doc.splitTextToSize(r.title, 105)[0], L + 44, y);
    doc.text(r.length, R, y, { align: "right" });
    doc.setFontSize(9).setTextColor(120).text(r.file, L + 44, y + 5);
    doc.setTextColor(0);
    y += 12;
  }
  y += 2;
  doc.line(L, y, R, y);
  y += 8;
  doc.setFont("helvetica", "bold").setFontSize(13).text(`Total ${formatDuration(totalSeconds(s.items))}`, L, y);
  if (s.start_time) doc.setFont("helvetica", "normal").text(`Ends ${clockAt(s.start_time, totalSeconds(s.items))}`, R, y, { align: "right" });
  if (s.notes) { y += 10; doc.setFont("helvetica", "italic").setFontSize(11).text(doc.splitTextToSize(s.notes, R - L), L, y); }
  return doc;
}
