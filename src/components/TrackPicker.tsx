"use client";
import { useMemo, useState } from "react";
import { formatDuration, type Track } from "@/lib/tracks";
import { Modal } from "./Modal";
import { LabelPill } from "./LabelPill";

export function TrackPicker({
  title, tracks, nearSeconds, recent, onPick, onClose,
}: {
  title: string;
  tracks: Track[];
  /** sort by closeness to this length (for swapping) */
  nearSeconds?: number;
  recent: Map<string, number>;
  onPick: (t: Track) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const f = tracks.filter((t) => !s || t.label.toLowerCase().includes(s) || t.title.toLowerCase().includes(s));
    return nearSeconds === undefined
      ? f
      : [...f].sort((a, b) => Math.abs(a.duration_seconds - nearSeconds) - Math.abs(b.duration_seconds - nearSeconds));
  }, [tracks, q, nearSeconds]);

  return (
    <Modal title={title} onClose={onClose}>
      <input autoFocus className="mb-3 w-full rounded-lg border border-black/20 bg-transparent px-3 py-3 dark:border-white/25" placeholder="Search label or title" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
        {list.map((t) => {
          const ago = recent.get(t.id);
          return (
            <li key={t.id}>
              <button onClick={() => onPick(t)} className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-black/5 dark:hover:bg-white/10">
                <LabelPill label={t.label} />
                <span className="flex-1">{t.title}</span>
                <span className="text-sm opacity-60">{t.song_type} · {ago ? `used ${ago} ago` : "new"}</span>
                <span className="tabular-nums">{formatDuration(t.duration_seconds)}</span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="p-4 text-center opacity-60">No tracks available.</li>}
      </ul>
    </Modal>
  );
}
