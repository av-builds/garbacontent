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

/** Label prefix for a track: its content code, or "T" when it has none. */
export function labelPrefix(code: ContentCode | "" | null): string {
  return code || "T";
}

/** Next free label for a prefix, e.g. FI3 when FI1 and FI2 are taken. */
export function nextLabel(prefix: string, used: Iterable<string>): string {
  const taken = new Set([...used].map((l) => l.toUpperCase()));
  for (let n = 1; ; n++) {
    const l = `${prefix}${n}`;
    if (!taken.has(l)) return l;
  }
}

/** Natural label order: CG1, CG2, CG10, FI1 ... */
export function compareLabels(a: string, b: string): number {
  const pa = /^(\D*)(\d*)/.exec(a)!, pb = /^(\D*)(\d*)/.exec(b)!;
  return pa[1].localeCompare(pb[1]) || Number(pa[2] || 0) - Number(pb[2] || 0) || a.localeCompare(b);
}

export function fileTypeOf(name: string): Track["file_type"] | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "mpg") return "mpeg";
  return ext === "mp3" || ext === "m4a" || ext === "mp4" || ext === "mpeg" ? ext : null;
}

/**
 * Understands names like "Song Name - FI42m.mp3" (content code + minutes).
 * Falls back to the cleaned file name as the title.
 */
export function parseFileName(name: string): { title: string; code: ContentCode | null; minutes: number | null } {
  let base = name.replace(/\.[^.]+$/, "");
  let code: ContentCode | null = null;
  let minutes: number | null = null;
  const cm = /^(.*?)\s*-\s*(FI|UG|CG|IG)\s*(\d+)\s*(?:m|min)\s*$/i.exec(base);
  if (cm) {
    base = cm[1];
    code = cm[2].toUpperCase() as ContentCode;
    minutes = Number(cm[3]);
  }
  return { title: base.replace(/_+/g, " ").trim(), code, minutes };
}

export function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const ext = fileTypeOf(file.name);
    const el = document.createElement(ext === "mp4" || ext === "mpeg" ? "video" : "audio");
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
