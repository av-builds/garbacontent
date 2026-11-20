import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Garba Content Planner",
  description: "Plan Garba sessions from a saved track library",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-lg">
        <nav className="print:hidden flex gap-2 border-b border-black/10 dark:border-white/15 px-4 py-3 text-base font-semibold">
          <span className="mr-4 self-center text-xl">Garba Planner</span>
          <Link href="/library" className="rounded-lg px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10">Library</Link>
          <Link href="/planner" className="rounded-lg px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10">Planner</Link>
          <Link href="/history" className="rounded-lg px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10">History</Link>
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
      </body>
    </html>
  );
}
