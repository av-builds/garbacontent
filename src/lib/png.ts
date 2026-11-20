import type { SavedSession } from "./sessions";
import { totalSeconds } from "./generate";
import { clockAt, shortDate } from "./time";
import { formatDuration } from "./tracks";
import { planRows } from "./exports";

/** 1080x1920 (WhatsApp status / chat friendly) plan card. */
export function renderPlanPng(s: SavedSession): Promise<Blob> {
  const W = 1080, H = 1920;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const font = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#312e81"); bg.addColorStop(1, "#0f0a2e");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  g.fillStyle = "#fff"; g.textBaseline = "alphabetic";
  g.font = `800 84px ${font}`; g.fillText("Garba Plan", 70, 170);
  g.font = `600 52px ${font}`; g.fillStyle = "#c7d2fe";
  g.fillText(shortDate(s.session_date), 70, 245);
  g.font = `500 40px ${font}`;
  g.fillText(`${s.start_time ? `Start ${clockAt(s.start_time, 0)} · ` : ""}about ${s.target_minutes} min`, 70, 305);

  const rows = planRows(s);
  const top = 370, bottom = H - 260;
  const rowH = Math.min(150, (bottom - top) / Math.max(rows.length, 1));
  const fit = (text: string, max: number) => {
    if (g.measureText(text).width <= max) return text;
    while (text.length > 1 && g.measureText(text + "…").width > max) text = text.slice(0, -1);
    return text + "…";
  };
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.beginPath(); g.roundRect(50, y, W - 100, rowH - 14, 24); g.fill();
    const mid = y + (rowH - 14) / 2;
    // label pill
    g.fillStyle = "#6366f1";
    g.beginPath(); g.roundRect(75, mid - 36, 150, 72, 36); g.fill();
    g.fillStyle = "#fff"; g.font = `800 44px ${font}`; g.textAlign = "center";
    g.fillText(r.label, 150, mid + 15);
    g.textAlign = "left";
    g.font = `600 44px ${font}`;
    g.fillText(fit(r.title, 560), 250, r.at ? mid - 2 : mid + 15);
    if (r.at) { g.font = `500 32px ${font}`; g.fillStyle = "#a5b4fc"; g.fillText(r.at, 250, mid + 38); }
    g.font = `600 42px ${font}`; g.fillStyle = "#fff"; g.textAlign = "right";
    g.fillText(r.length, W - 80, mid + 15);
    g.textAlign = "left";
  });

  const total = totalSeconds(s.items);
  g.fillStyle = "#fff"; g.font = `700 56px ${font}`;
  g.fillText(`Total ${formatDuration(total)}`, 70, H - 150);
  if (s.start_time) { g.font = `500 40px ${font}`; g.fillStyle = "#c7d2fe"; g.fillText(`Ends ${clockAt(s.start_time, total)}`, 70, H - 90); }

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG failed"))), "image/png"));
}
