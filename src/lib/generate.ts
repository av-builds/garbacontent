import type { Track } from "./tracks";

export type PlanItem = { track: Track; pinned: boolean };

export type GenInput = {
  tracks: Track[];
  targetMin: number;
  /** current plan; items with pinned=true are kept (at their position) */
  current: PlanItem[];
  excluded: Set<string>;
  /** track id -> how many sessions ago it was used (1 = most recent, up to 4) */
  recent: Map<string, number>;
  rng?: () => number;
  attempts?: number;
};

const TOL = 5 * 60;
const MAX = 90 * 60;
const SHORT = 5;

/** 4 = never used, lower the more recently it was used. */
function freshness(recent: Map<string, number>, id: string): number {
  const ago = recent.get(id);
  if (ago === undefined) return 4;
  return [0, 0.15, 0.3, 0.55, 0.8][ago] ?? 1;
}

function pickWeighted<T>(items: T[], weight: (t: T) => number, rng: () => number): T {
  const ws = items.map(weight);
  let r = rng() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function shuffle<T>(a: T[], rng: () => number): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function adjacencyPenalty(list: PlanItem[]): number {
  let p = 0;
  for (let i = 1; i < list.length; i++)
    if (list[i].track.category_minutes === list[i - 1].track.category_minutes) p += 20;
  if (list[0] && list[0].track.category_minutes !== SHORT) p += 3; // prefer a short opener
  return p;
}

/** Put pinned items at (clamped) original indexes, fill remaining slots with `free`. */
function merge(pinned: { item: PlanItem; index: number }[], free: PlanItem[]): PlanItem[] {
  const n = pinned.length + free.length;
  const slots: (PlanItem | null)[] = Array(n).fill(null);
  for (const p of [...pinned].sort((a, b) => a.index - b.index)) {
    let i = Math.min(p.index, n - 1);
    while (slots[i]) i = (i + 1) % n;
    slots[i] = p.item;
  }
  let f = 0;
  return slots.map((s) => s ?? free[f++]);
}

export function totalSeconds(plan: PlanItem[]): number {
  return plan.reduce((a, p) => a + p.track.duration_seconds, 0);
}

export function generatePlan(input: GenInput): PlanItem[] {
  const rng = input.rng ?? Math.random;
  const target = input.targetMin * 60;
  const pinned = input.current
    .map((item, index) => ({ item, index }))
    .filter((p) => p.item.pinned);
  const pinnedIds = new Set(pinned.map((p) => p.item.track.id));
  const pinnedTotal = pinned.reduce((a, p) => a + p.item.track.duration_seconds, 0);
  const pool = input.tracks.filter((t) => t.active && !input.excluded.has(t.id) && !pinnedIds.has(t.id));

  let best: PlanItem[] | null = null;
  let bestScore = Infinity;

  for (let a = 0; a < (input.attempts ?? 300); a++) {
    const chosen: Track[] = [];
    let total = pinnedTotal;
    let shorts = 0;
    while (total < target - TOL && chosen.length < 12) {
      const cands = pool.filter(
        (t) =>
          !chosen.includes(t) &&
          total + t.duration_seconds <= Math.min(target + TOL, MAX) &&
          !(t.category_minutes === SHORT && shorts >= 2)
      );
      if (!cands.length) break;
      const t = pickWeighted(cands, (c) => freshness(input.recent, c.id) + 0.2, rng);
      chosen.push(t);
      total += t.duration_seconds;
      if (t.category_minutes === SHORT) shorts++;
    }

    // best ordering of the free tracks
    let order: PlanItem[] = [];
    let orderPen = Infinity;
    const items = chosen.map((track) => ({ track, pinned: false }));
    for (let s = 0; s < 40; s++) {
      const cand = shuffle(items, rng);
      const merged = merge(pinned, cand);
      const pen = adjacencyPenalty(merged);
      if (pen < orderPen) {
        orderPen = pen;
        order = merged;
        if (pen === 0) break;
      }
    }
    if (!items.length) order = merge(pinned, []);

    const dev = Math.abs(total - target);
    const score =
      dev / 60 +
      Math.max(0, dev - TOL) / 60 * 10 +
      (total > MAX ? 1000 : 0) +
      chosen.reduce((s, t) => s + (1 - freshness(input.recent, t.id) / 4) * 8, 0) +
      orderPen +
      Math.max(0, chosen.length + pinned.length - 6) * 4;
    if (score < bestScore) {
      bestScore = score;
      best = order;
    }
  }
  return best ?? merge(pinned, []);
}
