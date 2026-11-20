export const CATEGORIES = [5, 20, 25, 40, 50, 60] as const;

export const SONG_TYPES = ["Garba", "Ismaili Songs", "Central Asian Content"] as const;
export type SongType = (typeof SONG_TYPES)[number];
export const DEFAULT_SONG_TYPE: SongType = "Garba";

export const CONTENT_CODES = ["FI", "CG", "UG", "IG"] as const;
export type ContentCode = (typeof CONTENT_CODES)[number];
export const CONTENT_CODE_INFO: Record<ContentCode, { name: string; note: string }> = {
  FI: { name: "Full Ismaili", note: "Suitable for the main prayer hall and everywhere else" },
  CG: { name: "Clean Gujarati", note: "Hindu references removed and verified; anywhere except the prayer hall" },
  UG: { name: "Unfiltered Gujarati", note: "May have Gujarati/Hindu references; unknown" },
  IG: { name: "Ismaili + Gujarati mix", note: "Cleanliness unknown, treated as Gujarati for now" },
};

export type Track = {
  id: string;
  label: string;
  title: string;
  duration_seconds: number;
  category_minutes: number;
  song_type: SongType;
  content_code: ContentCode | null;
  file_name: string;
  storage_path: string | null;
  file_type: "mp3" | "m4a" | "mp4" | "mpeg";
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type NewTrack = Omit<Track, "id" | "created_at" | "updated_at">;

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function categoryFromLabel(label: string): number | null {
  const m = /^(\d+)[A-Za-z]+$/.exec(label.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return (CATEGORIES as readonly number[]).includes(n) ? n : null;
}

/** Closest category to a duration. */
export function guessCategory(sec: number): number {
  const min = sec / 60;
  return CATEGORIES.reduce((best, c) =>
    Math.abs(c - min) < Math.abs(best - min) ? c : best
  );
}

function letters(i: number): string {
  let s = "";
  i += 1;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

/** Next free label like 5C, given labels already in use. */
export function nextLabel(category: number, used: Iterable<string>): string {
  const taken = new Set([...used].map((l) => l.toUpperCase()));
  for (let i = 0; ; i++) {
    const l = `${category}${letters(i)}`;
    if (!taken.has(l)) return l;
  }
}

export function fileTypeOf(name: string): Track["file_type"] | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "mpg") return "mpeg";
  return ext === "mp3" || ext === "m4a" || ext === "mp4" || ext === "mpeg" ? ext : null;
}

/**
 * Understands "5A - Song Name.mp3" (label) and "Song Name - FI42m.mp3" (content code + minutes).
 * Falls back to the cleaned file name as the title.
 */
export function parseFileName(name: string): {
  label: string | null;
  title: string;
  code: ContentCode | null;
  minutes: number | null;
} {
  let base = name.replace(/\.[^.]+$/, "");
  let label: string | null = null;
  let code: ContentCode | null = null;
  let minutes: number | null = null;
  const lm = /^(\d+[A-Za-z]+)\s*[-_.:]\s*(.+)$/.exec(base);
  if (lm && categoryFromLabel(lm[1])) {
    label = lm[1].toUpperCase();
    base = lm[2];
  }
  const cm = /^(.*?)\s*-\s*(FI|UG|CG|IG)\s*(\d+)\s*(?:m|min)\s*$/i.exec(base);
  if (cm) {
    base = cm[1];
    code = cm[2].toUpperCase() as ContentCode;
    minutes = Number(cm[3]);
  }
  return { label, title: base.replace(/_+/g, " ").trim(), code, minutes };
}

export function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(file.name.toLowerCase().endsWith(".mp4") ? "video" : "audio");
    el.preload = "metadata";
    const done = (v: number) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? Math.round(el.duration) : 0);
    el.onerror = () => done(0);
    el.src = url;
  });
}

/** Version letters of a label: "25B" -> "B". */
export function versionOf(label: string): string {
  return /^\d+([A-Za-z]+)$/.exec(label.trim())?.[1].toUpperCase() ?? "";
}

/** Natural label order: 5A, 5B ... 5Z, 5AA, then 20A ... */
export function compareLabels(a: string, b: string): number {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  if (na !== nb) return na - nb;
  const va = versionOf(a), vb = versionOf(b);
  return va.length - vb.length || va.localeCompare(vb);
}
