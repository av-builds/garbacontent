import { supabase } from "./supabase";
import type { Track } from "./tracks";
import type { PlanItem } from "./generate";

export type SavedSession = {
  id: string;
  session_date: string;
  day_of_week: string;
  target_minutes: number;
  start_time: string | null;
  notes: string | null;
  created_at: string;
  items: PlanItem[];
};

type Row = Omit<SavedSession, "items"> & {
  session_items: { position: number; pinned: boolean; tracks: Track }[];
};

const SELECT = "*, session_items(position, pinned, tracks(*))";

function shape(r: Row): SavedSession {
  const { session_items, ...rest } = r;
  return {
    ...rest,
    start_time: r.start_time ? r.start_time.slice(0, 5) : null,
    items: [...session_items].sort((a, b) => a.position - b.position).map((i) => ({ track: i.tracks, pinned: i.pinned })),
  };
}

export async function listSessions(): Promise<SavedSession[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select(SELECT)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as Row[]).map(shape);
}

export async function getSession(id: string): Promise<SavedSession | null> {
  const { data, error } = await supabase.from("sessions").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? shape(data as unknown as Row) : null;
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
