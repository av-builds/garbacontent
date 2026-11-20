"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BUCKET } from "@/lib/db";
import { CONTENT_CODES, CONTENT_CODE_INFO, SONG_TYPES, compareLabels, formatDuration, type ContentCode, type Track } from "@/lib/tracks";
import { LabelPill } from "@/components/LabelPill";
import { TrackActions } from "@/components/TrackActions";
import { ImportDialog } from "./ImportDialog";
import { EditDialog } from "./EditDialog";

const codeRank = (c: ContentCode | null) => (c ? CONTENT_CODES.indexOf(c) : CONTENT_CODES.length);

export default function LibraryPage() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [code, setCode] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(true);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Track | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("tracks").select("*").order("label");
    if (error) setError(error.message);
    else setTracks(data as Track[]);
  }, []);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (tracks ?? [])
      .filter(
        (t) =>
          (showInactive || t.active) &&
          (type === "all" || t.song_type === type) &&
          (code === "all" || t.content_code === code || (code === "none" && !t.content_code)) &&
          (!s || t.label.toLowerCase().includes(s) || t.title.toLowerCase().includes(s))
      )
      .sort((a, b) => codeRank(a.content_code) - codeRank(b.content_code) || compareLabels(a.label, b.label));
  }, [tracks, q, type, code, showInactive]);

  const totalSeconds = shown.reduce((a, t) => a + t.duration_seconds, 0);

  async function toggleActive(t: Track) {
    setTracks((prev) => prev!.map((x) => (x.id === t.id ? { ...x, active: !t.active } : x)));
    const { error } = await supabase.from("tracks").update({ active: !t.active }).eq("id", t.id);
    if (error) {
      setError(error.message);
      load();
    }
  }

  async function remove(t: Track) {
    if (!confirm(`Delete ${t.label}: ${t.title}? This cannot be undone.`)) return;
    setTracks((prev) => prev!.filter((x) => x.id !== t.id));
    const { error } = await supabase.from("tracks").delete().eq("id", t.id);
    if (error) {
      setError(error.message.includes("session_items") ? "Track is used in a saved session. Deactivate it instead." : error.message);
      load();
      return;
    }
    if (t.storage_path) await supabase.storage.from(BUCKET).remove([t.storage_path]);
  }

  const input = "rounded-lg border border-black/20 dark:border-white/25 bg-transparent px-3 py-3";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">
          Library {tracks && <span className="text-base font-normal opacity-60">({shown.length} tracks · {formatDuration(totalSeconds)})</span>}
        </h1>
        <button onClick={() => setImporting(true)} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          + Add tracks
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input className={`${input} min-w-48 flex-1`} placeholder="Search label or title" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={input} value={type} onChange={(e) => setType(e.target.value)} aria-label="Song type">
          <option value="all">All song types</option>
          {SONG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={input} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Content code">
          <option value="all">All content codes</option>
          {CONTENT_CODES.map((c) => <option key={c} value={c}>{c}: {CONTENT_CODE_INFO[c].name}</option>)}
          <option value="none">No code</option>
        </select>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-5" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-100 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          {error} <button className="underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {tracks && tracks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/25 p-10 text-center dark:border-white/25">
          <p className="text-xl font-semibold">No tracks yet</p>
          <p className="mt-1 opacity-70">Add your Garba tracks to start building sessions. You can pick many files at once.</p>
          <button onClick={() => setImporting(true)} className="mt-4 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white">Add tracks</button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-sm uppercase opacity-60">
              <tr>
                <th className="p-2">Label</th><th className="p-2">Title</th><th className="p-2">Length</th>
                <th className="p-2">Code</th><th className="p-2">Song type</th><th className="p-2">File</th><th className="p-2">Active</th><th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((t, idx) => (
                <Fragment key={t.id}>
                {(idx === 0 || shown[idx - 1].content_code !== t.content_code) && (() => {
                  const g = shown.filter((x) => x.content_code === t.content_code);
                  return (
                    <tr className="bg-indigo-500/10">
                      <td colSpan={8} className="p-2">
                        <span className="font-bold">{t.content_code ? `${t.content_code}: ${CONTENT_CODE_INFO[t.content_code].name}` : "No code"}</span>
                        <span className="ml-3 opacity-70">
                          {t.content_code ? `${CONTENT_CODE_INFO[t.content_code].note} · ` : ""}{g.length} track{g.length === 1 ? "" : "s"} · {formatDuration(g.reduce((a, x) => a + x.duration_seconds, 0))}
                        </span>
                      </td>
                    </tr>
                  );
                })()}
                <tr className={`border-t border-black/10 dark:border-white/10 ${t.active ? "" : "opacity-50"}`}>
                  <td className="p-2"><LabelPill label={t.label} /></td>
                  <td className="p-2">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-sm opacity-60">{t.file_name}{t.storage_path ? " · uploaded" : ""}</div>
                  </td>
                  <td className="p-2 tabular-nums">{formatDuration(t.duration_seconds)}</td>
                  <td className="p-2">
                    {t.content_code ? (
                      <span title={`${CONTENT_CODE_INFO[t.content_code].name}: ${CONTENT_CODE_INFO[t.content_code].note}`}
                        className={`rounded-md px-2 py-1 text-sm font-bold ${t.content_code === "FI" ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300" : t.content_code === "CG" ? "bg-sky-600/20 text-sky-700 dark:text-sky-300" : "bg-amber-500/25 text-amber-800 dark:text-amber-300"}`}>
                        {t.content_code}
                      </span>
                    ) : <span className="opacity-40">-</span>}
                  </td>
                  <td className="p-2"><span className="rounded-full bg-black/5 px-2 py-1 text-sm dark:bg-white/10">{t.song_type}</span></td>
                  <td className="p-2 uppercase">{t.file_type}</td>
                  <td className="p-2">
                    <input type="checkbox" className="size-6" checked={t.active} onChange={() => toggleActive(t)} aria-label={`Active ${t.label}`} />
                  </td>
                  <td className="whitespace-nowrap p-2 text-right">
                    <TrackActions track={t} queue={shown} />
                    <button onClick={() => setEditing(t)} className="rounded-lg px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10">Edit</button>
                    <button onClick={() => remove(t)} className="rounded-lg px-3 py-2 text-red-600 hover:bg-black/5 dark:hover:bg-white/10">Delete</button>
                  </td>
                </tr>
                </Fragment>
              ))}
              {tracks && shown.length === 0 && tracks.length > 0 && (
                <tr><td colSpan={8} className="p-6 text-center opacity-60">No tracks match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {importing && tracks && (
        <ImportDialog existing={tracks} onClose={() => setImporting(false)} onSaved={() => { setImporting(false); load(); }} />
      )}
      {editing && tracks && (
        <EditDialog track={editing} existing={tracks} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}
