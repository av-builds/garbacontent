export const GATE_COOKIE = "garba_gate";

/** Cookie value = sha256 of the password with a fixed salt, so the password itself is never stored. */
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

/** Only allow same-site relative paths as post-login targets. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/library";
}
