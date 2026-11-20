"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { listSessions, type SavedSession } from "@/lib/sessions";
import { totalSeconds } from "@/lib/generate";
import { clockAt, shortDate } from "@/lib/time";
import { formatDuration } from "@/lib/tracks";
import { buildFileList, buildM3U, buildWhatsApp, fileSlug, planRows, whatsAppLink } from "@/lib/exports";
import { saveBlob, saveText, zipTracks } from "@/lib/download";
import { renderPlanPng } from "@/lib/png";
import { buildPdf } from "@/lib/pdf";
import { usePlayer } from "@/components/PlayerProvider";
import { LabelPill } from "@/components/LabelPill";
import { TrackActions } from "@/components/TrackActions";

const btn = "rounded-lg border border-black/25 px-4 py-3 font-semibold hover:bg-black/5 dark:border-white/30 dark:hover:bg-white/10";
const primary = "rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-40";

export default function ExportPage() {
  return (
    <Suspense fallback={null}>
      <Export />
    </Suspense>
  );
}

function Export() {
  const id = useSearchParams().get("id") ?? "";
  const [all, setAll] = useState<SavedSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hlPinned, setHlPinned] = useState(true);
  const [hlNew, setHlNew] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [png, setPng] = useState<{ url: string; blob: Blob } | null>(null);
  const [zipMsg, setZipMsg] = useState<string | null>(null);
  const { play } = usePlayer();

  useEffect(() => {
    listSessions().then(setAll).catch((e) => setError(e.message));
  }, []);

  const session = all?.find((s) => s.id === id) ?? null;

  const newIds = useMemo(() => {
    const used = new Set<string>();
    (all ?? []).filter((s) => s.id !== id).forEach((s) => s.items.forEach((i) => used.add(i.track.id)));
    return new Set((session?.items ?? []).map((i) => i.track.id).filter((t) => !used.has(t)));
  }, [all, id, session]);

  const text = useMemo(
    () => (session ? buildWhatsApp(session, newIds, { highlightPinned: hlPinned, highlightNew: hlNew }) : ""),
    [session, newIds, hlPinned, hlNew]
  );

  useEffect(() => {
    if (!session) return;
    let url: string | null = null;
    renderPlanPng(session).then((blob) => {
      url = URL.createObjectURL(blob);
      setPng({ url, blob });
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [session]);

  async function copy(what: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Copy was blocked by the browser. Select the text and copy it manually.");
    }
  }

  async function zip() {
    if (!session) return;
    try {
      setZipMsg("Preparing ZIP…");
      const { blob, missing } = await zipTracks(session.items.map((i) => i.track), (d, t) => setZipMsg(`Fetching ${d}/${t}…`));
      saveBlob(blob, `${fileSlug(session)}.zip`);
      setZipMsg(missing.length ? `ZIP saved. Not included (not uploaded): ${missing.join(", ")}` : "ZIP saved.");
    } catch (e) {
      setZipMsg(e instanceof Error ? e.message : String(e));
    }
  }

  if (error && !session) return <p className="text-red-600">{error}</p>;
  if (!all) return <p className="opacity-60">Loading…</p>;
  if (!session)
    return (
      <p>
        That plan was not found. <Link className="underline" href="/history">Back to history</Link>
      </p>
    );

  const rows = planRows(session);
  const total = totalSeconds(session.items);
  const uploaded = rows.filter((r) => r.track.storage_path).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href="/history" className="rounded-lg px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10">← History</Link>
        <Link href={`/planner?session=${session.id}`} className="ml-auto rounded-lg px-4 py-2 font-semibold text-indigo-600 hover:bg-black/5 dark:text-indigo-400 dark:hover:bg-white/10">Edit in planner</Link>
      </div>

      {/* The plan itself: also the printable A4 page */}
      <section>
        <h1 className="text-3xl font-bold">Garba Plan</h1>
        <p className="text-xl">{shortDate(session.session_date)}</p>
        <p className="opacity-70">
          {session.start_time ? `Start ${clockAt(session.start_time, 0)} · ` : ""}about {session.target_minutes} min
        </p>
        <table className="mt-4 w-full text-left">
          <tbody>
            {rows.map((r) => (
              <tr key={r.n} className="border-t border-black/15 dark:border-white/20 print:border-black/30">
                <td className="w-24 py-2 tabular-nums opacity-70">{r.at}</td>
                <td className="w-24 py-2"><LabelPill label={r.label} /></td>
                <td className="py-2">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-sm opacity-60">{r.file}</div>
                </td>
                <td className="py-2 text-right tabular-nums">{r.length}</td>
                <td className="py-2 text-right print:hidden"><TrackActions track={r.track} queue={session.items.map((i) => i.track)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 border-t border-black/15 pt-3 text-lg font-bold dark:border-white/20 print:border-black/30">
          Total {formatDuration(total)}
          {session.start_time && <span className="ml-4 font-normal opacity-70">Ends {clockAt(session.start_time, total)}</span>}
        </p>
        {session.notes && <p className="mt-2 italic">{session.notes}</p>}
      </section>

      <div className="space-y-8 print:hidden">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">WhatsApp message</h2>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2"><input type="checkbox" className="size-5" checked={hlPinned} onChange={(e) => setHlPinned(e.target.checked)} /> Highlight pinned 📌</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="size-5" checked={hlNew} onChange={(e) => setHlNew(e.target.checked)} /> Highlight new tracks 🆕</label>
          </div>
          <textarea readOnly className="h-72 w-full rounded-lg border border-black/20 bg-transparent p-3 font-mono text-base dark:border-white/25" value={text} />
          <div className="flex flex-wrap gap-3">
            <button className={primary} onClick={() => copy("wa", text)}>{copied === "wa" ? "Copied ✓" : "Copy message"}</button>
            <a className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-600`} href={whatsAppLink(text)} target="_blank" rel="noreferrer">Share via WhatsApp</a>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Print and PDF</h2>
          <div className="flex flex-wrap gap-3">
            <button className={btn} onClick={() => window.print()}>Print (A4)</button>
            <button className={primary} onClick={() => buildPdf(session).save(`${fileSlug(session)}.pdf`)}>Download PDF</button>
          </div>
          <p className="text-sm opacity-70">The PDF uses standard fonts (Latin text). Printing from the browser handles any characters.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Image (WhatsApp status or chat)</h2>
          <button className={primary} disabled={!png} onClick={() => png && saveBlob(png.blob, `${fileSlug(session)}.png`)}>Download PNG</button>
          {png && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={png.url} alt="Plan preview" className="max-h-[32rem] rounded-xl border border-black/15 dark:border-white/20" />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Play the session</h2>
          <button className={primary} disabled={!uploaded} onClick={() => play(session.items.map((i) => i.track), session.items.map((i) => i.track).find((t) => t.storage_path)!)}>▶ Play all uploaded tracks in order</button>
          {!uploaded && <p className="text-sm opacity-70">None of these tracks were uploaded. Use the .m3u playlist below with the files in Downloads.</p>}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">USB files and playlist</h2>
          <p className="opacity-80">Copy exactly these {rows.length} files to the USB, in this order:</p>
          <ol className="list-decimal space-y-1 pl-8 font-mono text-base">
            {rows.map((r) => (
              <li key={r.n}>{r.file} <span className="font-sans text-sm opacity-60">{r.track.storage_path ? "· uploaded" : "· Downloads only"}</span></li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-3">
            <button className={btn} onClick={() => copy("files", buildFileList(session))}>{copied === "files" ? "Copied ✓" : "Copy file list"}</button>
            <button className={btn} onClick={() => saveText(buildFileList(session), `${fileSlug(session)}-files.txt`)}>Download list (.txt)</button>
            <button className={primary} onClick={() => saveText(buildM3U(session), `${fileSlug(session)}.m3u`, "audio/x-mpegurl")}>Download playlist (.m3u)</button>
            <button className={btn} disabled={!uploaded} onClick={zip}>Download ZIP ({uploaded} of {rows.length} uploaded)</button>
          </div>
          {zipMsg && <p>{zipMsg}</p>}
          <p className="text-sm opacity-70">Save the .m3u in the same folder as the audio files (for example Downloads), then open it with VLC or Windows Media Player. It lists file names only, in session order.</p>
        </section>
      </div>
    </div>
  );
}
