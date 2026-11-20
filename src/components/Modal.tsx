"use client";
import type { ReactNode } from "react";

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${wide ? "max-w-5xl" : "max-w-lg"} rounded-xl bg-[var(--background)] p-5 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg px-3 py-1 text-2xl hover:bg-black/5 dark:hover:bg-white/10">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
