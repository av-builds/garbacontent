"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, SONG_TYPES, categoryFromLabel, formatDuration, type SongType, type Track } from "@/lib/tracks";
import { Modal } from "@/components/Modal";

export function EditDialog({ track, existing, onClose, onSaved }: { track: Track; existing: Track[]; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState(track.label);
  const [title, setTitle] = useState(track.title);
  const [category, setCategory] = useState(track.category_minutes);
  const [songType, setSongType] = useState<SongType>(track.song_type);
  const [fileName, setFileName] = useState(track.file_name);
  const [mins, setMins] = useState(formatDuration(track.duration_seconds));
  const [notes, setNotes] = useState(track.notes ?? "");
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const l = label.trim().toUpperCase();
    const m = /^(\d+):(\d{1,2})$/.exec(mins.trim());
    if (!l || !title.trim()) return setErr("Label and title are required.");
    if (!m) return setErr("Length must look like 5:10.");
    if (existing.some((t) => t.id !== track.id && t.label.toUpperCase() === l)) return setErr(`Label ${l} is already used.`);
    const { error } = await supabase.from("tracks").update({
      label: l, title: title.trim(), category_minutes: category, song_type: songType, file_name: fileName.trim(),
      duration_seconds: Number(m[1]) * 60 + Number(m[2]), notes: notes.trim() || null,
    }).eq("id", track.id);
    if (error) setErr(error.message);
    else onSaved();
  }

  const input = "w-full rounded-lg border border-black/20 dark:border-white/25 bg-transparent px-3 py-3";
  return (
    <Modal title={`Edit ${track.label}`} onClose={onClose}>
      <div className="space-y-3">
        <label className="block">Label
          <input className={input} value={label} onChange={(e) => { setLabel(e.target.value); const c = categoryFromLabel(e.target.value); if (c) setCategory(c); }} />
        </label>
        <label className="block">Title<input className={input} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <div className="flex gap-3">
          <label className="flex-1">Length (m:ss)<input className={input} value={mins} onChange={(e) => setMins(e.target.value)} /></label>
          <label className="flex-1">Category
            <select className={input} value={category} onChange={(e) => setCategory(Number(e.target.value))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c} min</option>)}
            </select>
          </label>
        </div>
        <label className="block">Song type
          <select className={input} value={songType} onChange={(e) => setSongType(e.target.value as SongType)}>
            {SONG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block">File name (exact, as in Downloads)<input className={input} value={fileName} onChange={(e) => setFileName(e.target.value)} /></label>
        <label className="block">Notes<textarea className={input} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        {err && <p className="text-red-600">{err}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-5 py-3">Cancel</button>
          <button onClick={save} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white">Save</button>
        </div>
      </div>
    </Modal>
  );
}
