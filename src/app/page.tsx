"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/library");
  }, [router]);
  return (
    <p>
      Loading… <Link href="/library" className="underline">Open the library</Link>
    </p>
  );
}
