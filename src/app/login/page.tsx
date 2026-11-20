import { Suspense } from "react";

type Params = Promise<{ error?: string; next?: string }>;

export default function LoginPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={null}>
      <LoginForm searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginForm({ searchParams }: { searchParams: Params }) {
  const { error, next } = await searchParams;
  return (
    <div className="mx-auto mt-16 max-w-sm space-y-4">
      <h1 className="text-3xl font-bold">Garba Planner</h1>
      <p className="opacity-70">Enter the shared password to continue.</p>
      <form method="POST" action="/api/login" className="space-y-3">
        <input type="hidden" name="next" value={next ?? ""} />
        <input
          type="password"
          name="password"
          autoFocus
          required
          autoComplete="current-password"
          placeholder="Password"
          className="w-full rounded-lg border border-black/25 bg-transparent px-4 py-3 dark:border-white/30"
        />
        {error === "1" && <p className="text-red-600">Wrong password. Try again.</p>}
        {error === "config" && <p className="text-red-600">The server has no password configured (GATE_PASSWORD).</p>}
        <button className="w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">Enter</button>
      </form>
    </div>
  );
}
