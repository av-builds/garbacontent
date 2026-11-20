"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSession } from "@/lib/sessions";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CONTENT_CODES, CONTENT_CODE_INFO, DEFAULT_SONG_TYPE, SONG_TYPES, formatDuration, type ContentCode, type SongType, type Track } from "@/lib/tracks";
import { generatePlan, totalSeconds, type PlanItem } from "@/lib/generate";
import { clockAt, dayName, nextSessionDate } from "@/lib/time";
import { LabelPill } from "@/components/LabelPill";
import { TrackPicker } from "@/components/TrackPicker";
import { TrackActions } from "@/components/TrackActions";

type Picker = { mode: "add" } | { mode: "swap"; index: number } | null;

export default function PlannerPage() {
  return (
    <Suspense fallback={null}>
      <Planner />
    </Suspense>
  );
}

function Planner() {
  const sessionParam = useSearchParams().get("session");
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [date, setDate] = useState("");
  const [target, setTarget] = useState(75);
  const [start, setStart] = useState("20:00");
  const [notes, setNotes] = useState("");
  const [types, setTypes] = useState<SongType[]>([DEFAULT_SONG_TYPE]);
  const [codes, setCodes] = useState<ContentCode[]>([...CONTENT_CODES]);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [excluded, setExcluded] = useState<Track[]>([]);
  const [recent, setRecent] = useState<Map<string, number>>(new Map());
  const [picker, setPicker] = useState<Picker>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("tracks").select("*").order("category_minutes").order("label").then(({ data, error }) => {
      if (error) setStatus(error.message);
      else setTracks(data as Track[]);
    });
  }, []);

  useEffect(() => {
    if (!sessionParam) {
      setDate(nextSessionDate()); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    getSession(sessionParam)
      .then((s) => {
        if (!s) return setStatus("That saved plan no longer exists.");
        setDate(s.session_date);
        setTarget(s.target_minutes);
        if (s.start_time) setStart(s.start_time);
        setNotes(s.notes ?? "");
        setPlan(s.items);
        setSavedId(s.id);
        setStatus(null);
      })
      .catch((e) => setStatus(e.message));
  }, [sessionParam]);

  // usage in the previous 4 sessions before the chosen date
  useEffect(() => {
    if (!date) return;
    let live = true;
    supabase
      .from("sessions")
      .select("session_date, session_items(track_id)")
      .lt("session_date", date)
      .order("session_date", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (!live) return;
        const m = new Map<string, number>();
        (data ?? []).forEach((s, i) => {
          for (const it of s.session_items as { track_id: string }[]) if (!m.has(it.track_id)) m.set(it.track_id, i + 1);
        });
        setRecent(m);
      });
    return () => { live = false; };
  }, [date]);

  const total = totalSeconds(plan);
  const active = useMemo(() => (tracks ?? []).filter((t) => t.active), [tracks]);
  const inPlan = new Set(plan.map((p) => p.track.id));
  const edit = (next: PlanItem[]) => setPlan(next);

  function generate() {
    if (!tracks) return;
    setPlan(generatePlan({ tracks: tracks.filter((t) => types.includes(t.song_type) && (!t.content_code || codes.includes(t.content_code))), targetMin: target, current: plan, excluded: new Set(excluded.map((t) => t.id)), recent }));
    setStatus(null);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= plan.length || from === to) return;
    const next = [...plan];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    edit(next);
  }

  async function save() {
    setStatus("Saving…");
    try {
      let id = savedId;
      const row = { session_date: date, target_minutes: target, start_time: start, notes: notes.trim() || null };
      if (id) {
        const { error } = await supabase.from("sessions").update(row).eq("id", id);
        if (error) throw error;
        const { error: e2 } = await supabase.from("session_items").delete().eq("session_id", id);
        if (e2) throw e2;
      } else {
        const { data, error } = await supabase.from("sessions").insert(row).select("id").single();
        if (error) throw error;
        id = data.id as string;
      }
      const { error } = await supabase.from("session_items").insert(
        plan.map((p, i) => ({ session_id: id, track_id: p.track.id, position: i + 1, pinned: p.pinned }))
      );
      if (error) throw error;
      setSavedId(id);
      setStatus("Saved.");
    } catch (e) {
      setStatus(`Save failed: ${e instanceof Error ? e.message : (e as { message: string }).message}`);
    }
  }

  const input = "rounded-lg border border-black/20 dark:border-white/25 bg-transparent px-3 py-3";
  const btn = "rounded-lg px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10";
  const offsets = plan.map((_, i) => plan.slice(0, i).reduce((a, x) => a + x.track.duration_seconds, 0));

  if (tracks && active.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-black/25 p-10 text-center dark:border-white/25">
        <p className="text-xl font-semibold">Your library is empty</p>
        <p className="mt-1 opacity-70">Add some tracks first, then come back to plan a session.</p>
        <Link href="/library" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white">Go to Library</Link>
      </div>
    );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Planner</h1>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">Date<input type="date" className={`${input} block`} value={date} onChange={(e) => { setDate(e.target.value); setSavedId(null); }} /></label>
        <label className="block text-sm">Start time<input type="time" className={`${input} block`} value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="block text-sm">Target
          <select className={`${input} block`} value={target} onChange={(e) => setTarget(Number(e.target.value))}>
            {[60, 75, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
          <legend className="text-sm">Song types to include</legend>
          {SONG_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input type="checkbox" className="size-5" checked={types.includes(t)}
                onChange={(e) => setTypes((p) => (e.target.checked ? [...p, t] : p.filter((x) => x !== t)))} />
              {t}
            </label>
          ))}
        </fieldset>
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
          <legend className="text-sm">Content codes to include</legend>
          {CONTENT_CODES.map((c) => (
            <label key={c} className="flex items-center gap-2" title={`${CONTENT_CODE_INFO[c].name}: ${CONTENT_CODE_INFO[c].note}`}>
              <input type="checkbox" className="size-5" checked={codes.includes(c)}
                onChange={(e) => setCodes((p) => (e.target.checked ? [...p, c] : p.filter((x) => x !== c)))} />
              {c}
            </label>
          ))}
        </fieldset>
        <button onClick={generate} disabled={!tracks || !date || types.length === 0 || codes.length === 0} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
          {plan.length ? "Regenerate (keeps pinned)" : "Generate plan"}
        </button>
      </div>

      {plan.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/25 p-8 text-center opacity-70 dark:border-white/25">
          Pick a date and length, then press Generate plan. {dayName(date)}, {target} min.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 text-lg">
            <strong>{dayName(date)} {date}</strong>
            <span>Total <strong className="tabular-nums">{formatDuration(total)}</strong> ({Math.round(total / 60)} min)</span>
            <span>Ends {clockAt(start, total)}</span>
            {total > 90 * 60 && <span className="font-semibold text-red-600">Over 90 min!</span>}
          </div>
          <ol className="space-y-2">
            {plan.map((p, i) => {
              const startAt = clockAt(start, offsets[i]);
              const ago = recent.get(p.track.id);
              return (
                <li
                  key={p.track.id}
                  draggable
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragFrom !== null) move(dragFrom, i); setDragFrom(null); }}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${p.pinned ? "border-indigo-500 bg-indigo-500/10" : "border-black/15 dark:border-white/20"}`}
                >
                  <span className="cursor-grab select-none text-2xl opacity-50" title="Drag to reorder">⋮⋮</span>
                  <span className="w-20 text-sm tabular-nums opacity-70">{startAt}</span>
                  <LabelPill label={p.track.label} />
                  <div className="min-w-40 flex-1">
                    <div className="font-medium">{p.track.title}</div>
                    <div className="text-sm opacity-60">{p.track.file_name}{ago ? ` · used ${ago} session${ago > 1 ? "s" : ""} ago` : " · new"}</div>
                  </div>
                  <span className="tabular-nums">{formatDuration(p.track.duration_seconds)}</span>
                  <TrackActions track={p.track} queue={plan.map((x) => x.track)} />
                  <div className="flex flex-wrap text-base">
                    <button className={btn} onClick={() => move(i, i - 1)} aria-label="Move up">▲</button>
                    <button className={btn} onClick={() => move(i, i + 1)} aria-label="Move down">▼</button>
                    <button className={`${btn} ${p.pinned ? "font-bold text-indigo-600" : ""}`} onClick={() => edit(plan.map((x, j) => (j === i ? { ...x, pinned: !x.pinned } : x)))}>{p.pinned ? "📌 Pinned" : "Pin"}</button>
                    <button className={btn} onClick={() => setPicker({ mode: "swap", index: i })}>Swap</button>
                    <button className={btn} onClick={() => edit(plan.filter((_, j) => j !== i))}>Remove</button>
                    <button className={`${btn} text-red-600`} title="Remove and never pick it when regenerating" onClick={() => { setExcluded((e) => [...e, p.track]); edit(plan.filter((_, j) => j !== i)); }}>Exclude</button>
                  </div>
                </li>
              );
            })}
          </ol>
          <button className={`${btn} border border-black/20 dark:border-white/25`} onClick={() => setPicker({ mode: "add" })}>+ Add from library</button>
          <label className="block">Notes<textarea className={`${input} block w-full`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <div className="flex items-center gap-4">
            <button onClick={save} className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700">{savedId ? "Update saved plan" : "Save plan"}</button>
            {status && <span>{status}</span>}
            {savedId && <Link href={`/history/${savedId}`} className="font-semibold text-indigo-600 underline dark:text-indigo-400">Share &amp; export</Link>}
          </div>
        </>
      )}

      {excluded.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="opacity-70">Excluded from generation:</span>
          {excluded.map((t) => (
            <button key={t.id} className="rounded-full border border-black/20 px-3 py-1 dark:border-white/25" onClick={() => setExcluded((e) => e.filter((x) => x.id !== t.id))} title="Click to allow again">
              {t.label} ✕
            </button>
          ))}
        </div>
      )}
      {plan.length === 0 && status && <p>{status}</p>}

      {picker && (
        <TrackPicker
          title={picker.mode === "add" ? "Add from library" : "Swap for a similar track"}
          tracks={active.filter((t) => !inPlan.has(t.id))}
          nearSeconds={picker.mode === "swap" ? plan[picker.index].track.duration_seconds : undefined}
          recent={recent}
          onClose={() => setPicker(null)}
          onPick={(t) => {
            if (picker.mode === "add") edit([...plan, { track: t, pinned: true }]);
            else edit(plan.map((x, j) => (j === picker.index ? { track: t, pinned: true } : x)));
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}
