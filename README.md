# TerraVault Frontend

Next.js (App Router) + Tailwind CSS frontend for TerraVault. The homepage hosts
the valuation calculator, which calls the public valuation endpoint of
[terravault-backend](https://github.com/alexwhayman-cloud/terravault-backend).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Use `localhost`, not `127.0.0.1`: the backend's
default CORS allow-list is `http://localhost:3000,http://localhost:5173`
(`TERRAVAULT_CORS_ORIGINS`).

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_TERRAVAULT_API_URL` | `http://127.0.0.1:8000` | Base URL of the backend. Set in `.env.development`; override in `.env.local`. |

Brand palette: Cream `#F4EFE7` (background), Obsidian `#0E1B22` (text and
borders), Sage `#C9D8D5` (primary buttons), Sandstone `#E8D3C8` (cards).
