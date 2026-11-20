"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { signedUrl } from "@/lib/download";
import type { Track } from "@/lib/tracks";
import { LabelPill } from "./LabelPill";

type Ctx = {
  /** Play `queue` (uploaded tracks only) starting at the given track. */
  play: (queue: Track[], start: Track) => void;
  current: Track | null;
};

const PlayerContext = createContext<Ctx>({ play: () => {}, current: null });
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const current = queue[index] ?? null;

  const play = useCallback((q: Track[], start: Track) => {
    const playable = q.filter((t) => t.storage_path);
    const i = playable.findIndex((t) => t.id === start.id);
    if (i < 0) return;
    setQueue(playable);
    setIndex(i);
  }, []);

  // A fresh signed URL for every track, so long sessions never hit expiry.
  useEffect(() => {
    if (!current?.storage_path) return;
    let live = true;
    setError(null); // eslint-disable-line react-hooks/set-state-in-effect
    setUrl(null);
    signedUrl(current.storage_path)
      .then((u) => live && setUrl(u))
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [current]);

  const next = () => setIndex((i) => (i + 1 < queue.length ? i + 1 : i));
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const close = () => { audio.current?.pause(); setQueue([]); setUrl(null); };

  const bar = "rounded-lg px-4 py-2 text-xl hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10";
  return (
    <PlayerContext.Provider value={{ play, current }}>
      {children}
      {current && (
        <>
          <div className="h-32 print:hidden" />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/15 bg-[var(--background)] p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.12)] print:hidden dark:border-white/20">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
              <LabelPill label={current.label} />
              <div className="min-w-32 flex-1">
                <div className="font-semibold">{current.title}</div>
                <div className="text-sm opacity-60">{index + 1} of {queue.length}{error ? ` · ${error}` : ""}</div>
              </div>
              <button className={bar} onClick={prev} disabled={index === 0} aria-label="Previous">⏮</button>
              <button className={bar} onClick={next} disabled={index + 1 >= queue.length} aria-label="Next">⏭</button>
              <button className={bar} onClick={close} aria-label="Close player">✕</button>
              <audio
                key={url ?? "none"}
                ref={audio}
                src={url ?? undefined}
                controls
                autoPlay
                onEnded={next}
                onError={() => url && setError("Could not play this file")}
                className="h-12 w-full"
              />
            </div>
          </div>
        </>
      )}
    </PlayerContext.Provider>
  );
}
