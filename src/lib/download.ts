import JSZip from "jszip";
import { supabase } from "./supabase";
import { BUCKET } from "./db";
import type { Track } from "./tracks";

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function saveText(text: string, filename: string, type = "text/plain") {
  saveBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename);
}

export async function signedUrl(path: string, downloadName?: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600, downloadName ? { download: downloadName } : undefined);
  if (error || !data) throw new Error(error?.message ?? "Could not create download link");
  return data.signedUrl;
}

/** Zips the uploaded audio for these tracks (in order, original file names). */
export async function zipTracks(tracks: Track[], onProgress?: (done: number, total: number) => void) {
  const zip = new JSZip();
  const missing: string[] = [];
  const used = new Set<string>();
  const uploaded = tracks.filter((t) => t.storage_path);
  tracks.filter((t) => !t.storage_path).forEach((t) => missing.push(t.file_name));
  let done = 0;
  for (const t of uploaded) {
    const res = await fetch(await signedUrl(t.storage_path!));
    if (!res.ok) throw new Error(`Could not fetch ${t.file_name} (${res.status})`);
    let name = t.file_name;
    if (used.has(name)) name = `${t.label} - ${name}`;
    used.add(name);
    zip.file(name, await res.blob());
    onProgress?.(++done, uploaded.length);
  }
  if (!uploaded.length) throw new Error("None of these tracks were uploaded to storage.");
  return { blob: await zip.generateAsync({ type: "blob", compression: "STORE" }), missing };
}
