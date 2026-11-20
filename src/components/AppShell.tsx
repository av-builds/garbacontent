"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PlayerProvider } from "./PlayerProvider";

/** App frame: top navigation plus the in-app audio player. No login; anyone with the link can use the site. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <nav className="flex gap-2 border-b border-black/10 px-4 py-3 text-base font-semibold print:hidden dark:border-white/15">
        <span className="mr-4 self-center text-xl">Garba Planner</span>
        <Link href="/library" className="rounded-lg px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10">Library</Link>
        <Link href="/planner" className="rounded-lg px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10">Planner</Link>
        <Link href="/history" className="rounded-lg px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10">History</Link>
      </nav>
      <PlayerProvider>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
      </PlayerProvider>
    </>
  );
}
