"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteSession, listSessions, type SavedSession } from "@/lib/sessions";
import { totalSeconds } from "@/lib/generate";
import { clockAt } from "@/lib/time";
import { formatDuration } from "@/lib/tracks";
import { LabelPill } from "@/components/LabelPill";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SavedSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSessions().then(setSessions).catch((e) => setError(e.message));
  }, []);

  async function remove(s: SavedSession) {
    if (!confirm(`Delete the plan for ${s.day_of_week} ${s.session_date}?`)) return;
    setSessions((prev) => prev!.filter((x) => x.id !== s.id));
    try {
      await deleteSession(s.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      listSessions().then(setSessions);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">History</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
      {sessions && sessions.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/25 p-10 text-center dark:border-white/25">
          <p className="text-xl font-semibold">No saved sessions yet</p>
          <p className="mt-1 opacity-70">Plans you save from the Planner will show up here.</p>
          <Link href="/planner" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white">Plan a session</Link>
        </div>
      )}
      {sessions?.map((s) => {
        const total = totalSeconds(s.items);
        let offset = 0;
        return (
          <section key={s.id} className="rounded-xl border border-black/15 p-4 dark:border-white/20">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="text-xl font-bold">{s.day_of_week} {s.session_date}</h2>
              <span className="opacity-70">
                {s.items.length} tracks · {formatDuration(total)} (target {s.target_minutes} min)
                {s.start_time ? ` · starts ${clockAt(s.start_time, 0)}` : ""}
              </span>
              <span className="ml-auto flex gap-2">
                <Link href={`/planner?session=${s.id}`} className="rounded-lg px-4 py-2 font-semibold text-indigo-600 hover:bg-black/5 dark:text-indigo-400 dark:hover:bg-white/10">Open in planner</Link>
                <button onClick={() => remove(s)} className="rounded-lg px-4 py-2 text-red-600 hover:bg-black/5 dark:hover:bg-white/10">Delete</button>
              </span>
            </div>
            {s.notes && <p className="mt-1 italic opacity-80">{s.notes}</p>}
            <ol className="mt-3 space-y-1">
              {s.items.map((it, i) => {
                const at = s.start_time ? clockAt(s.start_time, offset) : null;
                offset += it.track.duration_seconds;
                return (
                  <li key={`${it.track.id}-${i}`} className="flex flex-wrap items-center gap-3">
                    <span className="w-6 text-right opacity-50">{i + 1}.</span>
                    {at && <span className="w-20 text-sm tabular-nums opacity-70">{at}</span>}
                    <LabelPill label={it.track.label} />
                    <span className="flex-1">{it.track.title}{it.pinned && <span className="ml-2 text-sm">📌</span>}</span>
                    <span className="tabular-nums">{formatDuration(it.track.duration_seconds)}</span>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
