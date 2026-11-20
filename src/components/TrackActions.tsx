"use client";

import { useState } from "react";
import { signedUrl } from "@/lib/download";
import type { Track } from "@/lib/tracks";
import { usePlayer } from "./PlayerProvider";

/** Play (in-app, from storage) and Download buttons. Only for uploaded tracks. */
export function TrackActions({ track, queue }: { track: Track; queue: Track[] }) {
  const { play, current } = usePlayer();
  const [err, setErr] = useState(false);
  if (!track.storage_path)
    return <span className="text-sm opacity-50" title="Not uploaded; use the file in Downloads">Downloads only</span>;

  async function download() {
    try {
      setErr(false);
      const a = document.createElement("a");
      a.href = await signedUrl(track.storage_path!, track.file_name);
      a.download = track.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setErr(true);
    }
  }

  const b = "rounded-lg px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10";
  return (
    <span className="whitespace-nowrap">
      <button className={`${b} ${current?.id === track.id ? "font-bold text-indigo-600" : ""}`} onClick={() => play(queue, track)} aria-label={`Play ${track.label}`}>
        {current?.id === track.id ? "▶ Playing" : "▶ Play"}
      </button>
      <button className={b} onClick={download} aria-label={`Download ${track.file_name}`}>⬇ File</button>
      {err && <span className="text-sm text-red-600">failed</span>}
    </span>
  );
}
