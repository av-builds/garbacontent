import type { SavedSession } from "./sessions";
import { totalSeconds } from "./generate";
import { clockAt, shortDate } from "./time";
import { formatDuration } from "./tracks";

export type WhatsAppOpts = { highlightPinned: boolean; highlightNew: boolean };

export function planRows(s: SavedSession) {
  let offset = 0;
  return s.items.map((it, i) => {
    const row = {
      n: i + 1,
      at: s.start_time ? clockAt(s.start_time, offset) : null,
      label: it.track.label,
      title: it.track.title,
      length: formatDuration(it.track.duration_seconds),
      seconds: it.track.duration_seconds,
      file: it.track.file_name,
      pinned: it.pinned,
      track: it.track,
    };
    offset += it.track.duration_seconds;
    return row;
  });
}

/** WhatsApp bold is *text*. `newIds` = tracks not used in any other saved session. */
export function buildWhatsApp(s: SavedSession, newIds: Set<string>, o: WhatsAppOpts): string {
  const total = totalSeconds(s.items);
  const head = `*Garba Plan, ${shortDate(s.session_date)}*`;
  const sub = `${s.start_time ? `Start ${clockAt(s.start_time, 0)}, ` : ""}about ${s.target_minutes} min`;
  const lines = planRows(s).map((r) => {
    const flags: string[] = [];
    if (o.highlightPinned && r.pinned) flags.push("📌");
    if (o.highlightNew && newIds.has(r.track.id)) flags.push("🆕");
    const body = `${r.label}: ${r.title} (${r.length})`;
    return `${r.n}. ${flags.length ? `*${body}* ${flags.join(" ")}` : body}`;
  });
  const out = [head, sub, "", ...lines, "", `Total: ${formatDuration(total)}`];
  if (s.notes) out.push("", s.notes);
  return out.join("\n");
}

export function whatsAppLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildFileList(s: SavedSession): string {
  return planRows(s).map((r) => r.file).join("\r\n") + "\r\n";
}

/** Relative paths: save the .m3u in the same folder as the audio files (e.g. Downloads). */
export function buildM3U(s: SavedSession): string {
  const lines = ["#EXTM3U"];
  for (const r of planRows(s)) {
    lines.push(`#EXTINF:${r.seconds},${r.label} - ${r.title}`, r.file);
  }
  return lines.join("\r\n") + "\r\n";
}

export function fileSlug(s: SavedSession): string {
  return `garba-${s.session_date}`;
}
