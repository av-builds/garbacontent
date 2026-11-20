"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { GATE_HASH, GATE_STORAGE_KEY, gateToken, safeEqual } from "@/lib/gate";
import { PlayerProvider } from "./PlayerProvider";

type State = "checking" | "locked" | "open" | "unconfigured";

/**
 * Client-side shared-password gate (static hosting has no server).
 * NOTE: this only keeps casual visitors out. Anyone can read the app's code and the public
 * Supabase key. Tighten with Supabase Auth later.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(GATE_STORAGE_KEY); } catch {}
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!GATE_HASH) setState("unconfigured");
    else setState(saved && safeEqual(saved, GATE_HASH) ? "open" : "locked");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = await gateToken(password);
    if (safeEqual(token, GATE_HASH)) {
      try { localStorage.setItem(GATE_STORAGE_KEY, token); } catch {}
      setError(false);
      setState("open");
    } else {
      setError(true);
    }
  }

  function logout() {
    try { localStorage.removeItem(GATE_STORAGE_KEY); } catch {}
    setPassword("");
    setState("locked");
  }

  if (state === "checking") return null;

  if (state !== "open")
    return (
      <main className="mx-auto mt-16 w-full max-w-sm space-y-4 p-4">
        <h1 className="text-3xl font-bold">Garba Planner</h1>
        {state === "unconfigured" ? (
          <p className="text-red-600">No password is configured for this build (GATE_PASSWORD secret).</p>
        ) : (
          <>
            <p className="opacity-70">Enter the shared password to continue.</p>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="password"
                autoFocus
                required
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-black/25 bg-transparent px-4 py-3 dark:border-white/30"
              />
              {error && <p className="text-red-600">Wrong password. Try again.</p>}
              <button className="w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">Enter</button>
            </form>
          </>
        )}
      </main>
    );

  return (
    <>
      <nav className="flex gap-2 border-b border-black/10 px-4 py-3 text-base font-semibold print:hidden dark:border-white/15">
        <span className="mr-4 self-center text-xl">Garba Planner</span>
        <Link href="/library" className="rounded-lg px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10">Library</Link>
        <Link href="/planner" className="rounded-lg px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10">Planner</Link>
        <Link href="/history" className="rounded-lg px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10">History</Link>
        <button onClick={logout} className="ml-auto rounded-lg px-4 py-2 opacity-70 hover:bg-black/5 dark:hover:bg-white/10">Log out</button>
      </nav>
      <PlayerProvider>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
      </PlayerProvider>
    </>
  );
}
