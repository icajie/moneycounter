# moneycounter

## What this is
This is a lightweight, mostly static personal finance tracker that lets a user view and categorize transactions in the browser, with a small serverless API layer likely used for auth/data access. It appears aimed at quick deployment (Vercel config present) rather than a full backend-heavy architecture.

### Stack
- **Language(s):** HTML/CSS/JavaScript (frontend), JSON config/data
- **Framework / runtime:** Static web app + Vercel serverless functions (`api/`)
- **Notable libraries:** Very minimal dependency footprint (no major framework declared in `package.json`)

## How it's organized
```text
api/                 Serverless backend endpoints (Vercel-style functions)
README.md            Minimal project readme
index.html           Main app UI and client-side logic
login.html           Login/authentication page
transactions.json    Transaction dataset/source file
config.json          Runtime/app configuration
package.json         Node package metadata (very small)
vercel.json          Deployment + routing/runtime config for Vercel
```

**How it fits together:**  
`login.html` handles user sign-in flow, and `index.html` is the main transaction/dashboard interface. The frontend likely reads transaction/config JSON and calls endpoints under `api/` for dynamic behavior. `vercel.json` wires hosting/runtime behavior so the static pages and API functions are served together.

## How to run it
From a fresh clone, the shortest path is likely static serving + optional Vercel runtime:

```bash
git clone https://github.com/icajie/moneycounter.git
cd moneycounter
npm install
# run with Vercel (if installed)
npx vercel dev
# or serve statically (frontend-only)
# python3 -m http.server 8000
```

Then open:
- `http://localhost:3000` (Vercel dev default), or
- `http://localhost:8000` (static server default)

**Likely entry points:**
- **App UI:** `index.html`
- **Auth page:** `login.html`
- **API functions:** files under `api/` (served in Vercel dev)

## Try asking
- “Can you map the exact request flow between `login.html` and the `api/` endpoints?”
- “What fields are expected in `transactions.json`, and where in `index.html` are they consumed?”
- “Can you review `vercel.json` and explain how routes are split between static pages and serverless functions?”
