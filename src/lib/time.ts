export function toLocalISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Today if Friday/Saturday, otherwise the coming Friday. */
export function nextSessionDate(from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const dow = d.getDay();
  if (dow !== 5 && dow !== 6) d.setDate(d.getDate() + ((5 - dow + 7) % 7));
  return toLocalISODate(d);
}

export function dayName(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-NZ", { weekday: "long" });
}

/** "20:00" + offset seconds -> "8:00 pm" */
export function clockAt(start: string, offsetSec: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = Math.round((h * 3600 + m * 60 + offsetSec) / 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  const ampm = hh >= 12 ? "pm" : "am";
  return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${ampm}`;
}
