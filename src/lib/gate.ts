export const GATE_STORAGE_KEY = "garba_gate";

/** Hash of the shared password, baked in at build time (the password itself is never shipped). */
export const GATE_HASH = process.env.NEXT_PUBLIC_GATE_HASH ?? "";

/** sha256 hex of "garba-gate:v1:<password>". The deploy workflow computes the same value. */
export async function gateToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`garba-gate:v1:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
