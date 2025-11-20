# Dyllon's Service Point — Main Site (Frontend)

**What this is:** A production-ready React + Vite + Tailwind frontend scaffold for the main public site.
Includes Supabase integration scaffolding and ready-to-deploy build.

## Structure
- `index.html` — app entry
- `src/` — React app source
- `src/pages/` — page components (Home, AdminLanding, Auth)
- `src/components/` — shared components (Header, Footer)
- `src/utils/` — supabase client helper
- `public/assets/` — images & assets
- `tailwind.config.cjs`, `postcss.config.cjs` — Tailwind setup
- `.env.example` — env vars

## Install (local)
1. `npm install`
2. Create `.env` using `.env.example` and fill in your Supabase values.
3. `npm run dev` — development server
4. `npm run build` — production build
5. `npm run preview` — preview production build

## GitHub & Deploy
- This repo is ready for GitHub. Add `render.yaml` or Vercel/Netlify settings if you deploy there.
- Suggested branch: `main`. Add GitHub Actions / Render config as needed.

## Notes
- Replace placeholder logos in `public/assets/`.
- Admin pages are scaffolded — for a full working admin you need backend or Supabase table rules which this frontend expects.
