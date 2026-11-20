# Garba Content Planner

Plans Garba sessions (Friday and Saturday, about 60 to 90 minutes). Keep a library of tracks, generate a varied
session plan for a date, and export it as a WhatsApp message, printable A4/PDF, PNG image, USB file list,
`.m3u` playlist or ZIP of the audio.

Stack: Next.js (App Router, TypeScript, Tailwind), Supabase (Postgres + private Storage), Netlify.

## Pages

- `/library`: tracks grouped by length (the number in the label) with version letters; add/bulk import, edit, filter, play, download.
- `/planner`: generate, pin, exclude, swap, drag to reorder, save.
- `/history`: saved sessions; `/history/<id>` has all the exports.
- `/login`: shared password gate (everything else requires it).

Labels: the number is the length group in minutes (5, 20, 25, 40, 50, 60) and the letter is the version, e.g. `25B`.

## Local setup

```bash
cp .env.example .env.local   # fill in the three values
npm install
npm run dev
```

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `GATE_PASSWORD` | Shared password for the app. Server-side only. If unset, nobody can log in. |

Never commit `.env.local`.

## Database

Schema lives in `supabase/migrations/`. Apply it to a new Supabase project (SQL editor or `supabase db push`).
It creates `tracks`, `sessions`, `session_items`, row level security policies, and the private `garba-audio` bucket.

## Deploy (Netlify)

1. Netlify: Add new site, Import from Git, pick this repository and the branch to deploy (production branch, usually `main`).
2. Build command `npm run build` (set in `netlify.toml`); Netlify's Next.js support is automatic.
3. Site configuration, Environment variables: add the three variables above.
4. Every push to the production branch redeploys automatically.

## Security notes (please read)

The shared password gate protects the pages, but the Supabase anon key is public by design and the row level
security policies currently allow the `anon` role full access to the tables and the `garba-audio` bucket.
Anyone who has the key and URL could read or change data directly. For a small private tool this is a
known trade-off; to tighten it, move to Supabase Auth and replace the `anon` policies with `authenticated`
ones, and make bucket policies user-scoped.

Other limits: Supabase's free plan caps uploaded files at 50 MB each; the PDF export uses standard (Latin) fonts,
while browser Print handles any characters.
