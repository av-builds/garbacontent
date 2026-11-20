import { supabase } from "./supabase";
import type { NewTrack, Track } from "./tracks";

export const BUCKET = "garba-audio";

export async function uploadAudio(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function insertTracks(rows: NewTrack[]): Promise<Track[]> {
  const { data, error } = await supabase.from("tracks").insert(rows).select();
  if (error) throw new Error(error.message);
  return data as Track[];
}
