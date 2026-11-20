# Garba Content Planner

Plans Garba sessions (Friday and Saturday). Keep a library of tracks, type how many minutes of content you need,
press Enter, and get a varied plan. Export it as a WhatsApp message, printable A4/PDF, PNG image, USB file list,
`.m3u` playlist or ZIP of the audio.

Stack: Next.js (static export, TypeScript, Tailwind), Supabase (Postgres + private Storage), GitHub Pages.
Live at `https://av-builds.github.io/garbacontent/`.

## Pages

- `/library`: tracks with song type (Garba, Ismaili Songs, Central Asian Content) and content code; add/bulk import, edit, filter, play, download.
- `/planner`: type the minutes needed and press Enter. Pin, exclude, swap, drag to reorder, save.
- `/history`: saved sessions; "Share & export" has WhatsApp, print/PDF, PNG, USB list, `.m3u` and ZIP.

Content codes: **FI** Full Ismaili (any room, including the main prayer hall) · **CG** Clean Gujarati (anywhere except
the prayer hall) · **UG** Unfiltered Gujarati (unknown) · **IG** Ismaili + Gujarati mix (treated as Gujarati).
Labels are the code plus a running number (FI1, CG2 ...); change them freely.

## Deploy (GitHub Pages, automatic)

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.

One-time setup in the GitHub repository settings:

1. Settings, Pages, Build and deployment, Source: **GitHub Actions**.
2. Settings, Secrets and variables, Actions, New repository secret: **`GATE_PASSWORD`** (the shared password).
   The build only embeds a SHA-256 hash of it, never the password.
3. (Recommended) Settings, Branches: make `main` the default branch.

Change the password later by updating the secret and re-running the workflow.

## Local development

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000/garbacontent/
```

Set `NEXT_PUBLIC_GATE_HASH` to the output of:

```bash
printf 'garba-gate:v1:%s' 'your-password' | sha256sum | cut -d' ' -f1
```

## Database

Schema lives in `supabase/migrations/` (apply in order to a Supabase project). It creates `tracks`, `sessions`,
`session_items`, row level security policies and the private `garba-audio` bucket.

## Security notes (please read)

GitHub Pages is static hosting, so the password gate runs **in the browser**. It keeps casual visitors out, but
anyone who reads the site's code can bypass it or try to guess the password from its hash. On top of that, the
Supabase anon key is public by design and the row level security policies currently let the `anon` role read and
write all tables and the `garba-audio` bucket, so anyone with the key and project URL can reach the data directly.
For a small private tool this is a known trade-off. To tighten it, move to Supabase Auth, replace the `anon`
policies with `authenticated` ones, and scope the bucket policies per user.

Other limits: Supabase's free plan caps uploaded files at 50 MB each; the PDF export uses standard (Latin) fonts,
while browser Print handles any characters.
