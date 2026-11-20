"use client";
import { useRef, useState } from "react";
import { insertTracks, uploadAudio } from "@/lib/db";
import {
  CATEGORIES, CONTENT_CODES, DEFAULT_SONG_TYPE, SONG_TYPES, categoryFromLabel, fileTypeOf, formatDuration, guessCategory, nextLabel,
  parseFileName, readDuration, type ContentCode, type SongType, type Track,
} from "@/lib/tracks";
import { Modal } from "@/components/Modal";

type Row = { key: number; file: File; label: string; title: string; category: number; seconds: number; upload: boolean; songType: SongType; code: ContentCode | "" };

export function ImportDialog({ existing, onClose, onSaved }: { existing: Track[]; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [uploadAll, setUploadAll] = useState(false);
  const [typeAll, setTypeAll] = useState<SongType>(DEFAULT_SONG_TYPE);
  const keyRef = useRef(0);

  /** Assign labels for rows lacking a valid unique one, keeping existing choices. */
  function relabel(list: Row[]): Row[] {
    const used = new Set(existing.map((t) => t.label.toUpperCase()));
    const out: Row[] = [];
    for (const r of list) {
      let label = r.label.trim().toUpperCase();
      if (!label || used.has(label)) label = nextLabel(r.category, used);
      used.add(label);
      out.push({ ...r, label });
    }
    return out;
  }

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr(null);
    const added: Row[] = [];
    const skipped: string[] = [];
    for (const file of Array.from(files)) {
      if (!fileTypeOf(file.name)) { skipped.push(file.name); continue; }
      const seconds = await readDuration(file);
      const p = parseFileName(file.name);
      const shownSeconds = seconds || (p.minutes ? p.minutes * 60 : 0);
      const category = (p.label && categoryFromLabel(p.label)) || guessCategory(shownSeconds);
      added.push({ key: keyRef.current++, file, label: p.label ?? "", title: p.title, category, seconds: shownSeconds, upload: uploadAll, songType: typeAll, code: p.code ?? "" });
    }
    // Clear labels that were not parsed so relabel assigns them in order
    setRows((prev) => relabel([...prev, ...added]));
    setMsg(skipped.length ? `Skipped (not mp3/m4a/mp4): ${skipped.join(", ")}` : null);
    setBusy(false);
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((prev) => {
      const next = prev.map((r) => (r.key === key ? { ...r, ...patch } : r));
      // changing category re-suggests a label
      if (patch.category !== undefined) {
        const used = new Set([...existing.map((t) => t.label.toUpperCase()), ...next.filter((r) => r.key !== key).map((r) => r.label.toUpperCase())]);
        return next.map((r) => (r.key === key ? { ...r, label: nextLabel(patch.category!, used) } : r));
      }
      return next;
    });
  }

  async function save() {
    setErr(null);
    const labels = rows.map((r) => r.label.trim().toUpperCase());
    const taken = new Set(existing.map((t) => t.label.toUpperCase()));
    const dup = labels.find((l, i) => !l || taken.has(l) || labels.indexOf(l) !== i);
    if (dup !== undefined) return setErr(dup ? `Label ${dup} is duplicated or already used.` : "Every track needs a label.");
    setBusy(true);
    try {
      const payload = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        setMsg(`Saving ${i + 1} of ${rows.length}…`);
        const storage_path = r.upload ? await uploadAudio(r.file) : null;
        payload.push({
          label: labels[i], title: r.title.trim() || r.file.name, duration_seconds: r.seconds,
          category_minutes: r.category, song_type: r.songType, content_code: r.code || null, file_name: r.file.name, storage_path,
          file_type: fileTypeOf(r.file.name)!, notes: null, active: true,
        });
      }
      await insertTracks(payload);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const cell = "w-full rounded-lg border border-black/20 dark:border-white/25 bg-transparent px-2 py-2";
  return (
    <Modal title="Add tracks" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="cursor-pointer rounded-lg border border-black/25 px-4 py-3 font-semibold dark:border-white/30">
            Choose files (one or many)
            <input type="file" multiple accept=".mp3,.m4a,.mp4,.mpeg,.mpg,audio/*,video/*" className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
          </label>
          <label className="flex items-center gap-2">
            Song type
            <select className="rounded-lg border border-black/20 bg-transparent px-2 py-2 dark:border-white/25" value={typeAll}
              onChange={(e) => { const v = e.target.value as SongType; setTypeAll(v); setRows((p) => p.map((r) => ({ ...r, songType: v }))); }}>
              {SONG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-5" checked={uploadAll} onChange={(e) => { setUploadAll(e.target.checked); setRows((p) => p.map((r) => ({ ...r, upload: e.target.checked }))); }} />
            Upload audio to Supabase Storage (enables in-app playback and ZIP)
          </label>
        </div>
        <p className="text-sm opacity-70">Tip: name files like <code>5A - Song Name.mp3</code> to preset the label. Otherwise labels are suggested automatically. Everything is editable.</p>
        {msg && <p className="opacity-80">{msg}</p>}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead className="text-sm uppercase opacity-60"><tr><th className="p-1">Label</th><th className="p-1">Title</th><th className="p-1">Length</th><th className="p-1">Cat.</th><th className="p-1">Code</th><th className="p-1">Song type</th><th className="p-1">Upload</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-black/10 align-top dark:border-white/10">
                    <td className="p-1 w-24"><input className={cell} value={r.label} onChange={(e) => update(r.key, { label: e.target.value })} /></td>
                    <td className="p-1">
                      <input className={cell} value={r.title} onChange={(e) => update(r.key, { title: e.target.value })} />
                      <div className="mt-1 text-xs opacity-60">{r.file.name}</div>
                    </td>
                    <td className="p-1 tabular-nums">{r.seconds ? formatDuration(r.seconds) : "?"}</td>
                    <td className="p-1 w-28">
                      <select className={cell} value={r.category} onChange={(e) => update(r.key, { category: Number(e.target.value) })}>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c} min</option>)}
                      </select>
                    </td>
                    <td className="p-1 w-24">
                      <select className={cell} value={r.code} onChange={(e) => update(r.key, { code: e.target.value as ContentCode | "" })}>
                        <option value="">-</option>
                        {CONTENT_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="p-1 w-44">
                      <select className={cell} value={r.songType} onChange={(e) => update(r.key, { songType: e.target.value as SongType })}>
                        {SONG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="p-1"><input type="checkbox" className="size-5" checked={r.upload} onChange={(e) => update(r.key, { upload: e.target.checked })} /></td>
                    <td className="p-1"><button className="px-2 py-1 text-red-600" onClick={() => setRows((p) => p.filter((x) => x.key !== r.key))}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {err && <p className="text-red-600">{err}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-5 py-3">Cancel</button>
          <button disabled={!rows.length || busy} onClick={save} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-40">
            Save {rows.length || ""} track{rows.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
