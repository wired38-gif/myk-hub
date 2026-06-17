# myk-hub

Multi-domain Node.js hub for **myk.ac**, **patemusic.live**, and **ltibyjmichael.com**. One Express app serves each domain's static site from `sites/<name>/`.

## GoDaddy Node.js PaaS deploy

**Repository:** `wired38-gif/myk-hub` (this repo — not `Myks-Brain` / `myks-app`).

| Setting | Value |
|--------|--------|
| **GitHub repo** | `wired38-gif/myk-hub` |
| **Branch** | `main` |
| **Application root / Source directory** | `.` or **leave empty** (repo root) |
| **Start command** | `npm start` (from `package.json`) |
| **Node version** | 18 or 22 — see [Node.js runtime](#nodejs-runtime-no-dashboard-picker) below |

Do **not** set the source directory to `sites/`, `sites/myk-hub`, or any subfolder — `package.json` and `server.js` live at the **repository root**.

If you connected the parent monorepo (`Myks-Brain`), GoDaddy will not find `package.json` at `/app` because `sites/` is not tracked there. Reconnect this repo instead.

### Required env (optional Brain proxy)

| Variable | Example | Purpose |
|----------|---------|---------|
| `PORT` | *(set by GoDaddy)* | App listen port |
| `BRAIN_PROXY_ENABLED` | `1` | Enable `/brain` proxy |
| `BRAIN_PROXY_TARGET` | `https://your-tunnel.example` | Gateway URL |
| `BRAIN_PROXY_PREFIX` | `/brain` | URL prefix |

Default target is also read from `config/brain-proxy-target.json` when env vars are unset.

### Local run

```bash
npm install
npm start
# http://localhost:20010 (set PORT to override)
```

### `vite.config.js` (required for GoDaddy Git sync)

This hub is **plain Express** — not a Vite SPA — but **keep `vite.config.js` committed on `main`**. GoDaddy Node.js PaaS may modify that file locally for hostname routing; if `main` deletes it, the next platform pull hits a **modify/delete merge conflict** and deploy fails.

- **`vite.config.js`** — `server.allowedHosts` must match **`.godaddy`** `allowedHosts` (platform reads both).
- **`vite`** is a **production dependency** so `npm install --omit=dev` still installs `node_modules/.bin/vite` if the platform invokes the Vite CLI.
- **`npm run build`** stays **`node scripts/ensure-sites.js` only** — no `vite build` in the build script unless GoDaddy requires it.
- **`index.html`** at the **repo root** — stub entry so GoDaddy’s automatic **`vite build`** step does not fail with `Could not resolve entry module "index.html"`. Express still serves `sites/<name>/`; ignore `dist/` output.

### Merge conflicts on GoDaddy pull

See **[MERGE.md](./MERGE.md)** for hard-reset steps and the modify/delete + add/add root cause. Keep `vite.config.js` as a **single line** matching `.godaddy` `allowedHosts`.

If pull still fails, open the repo on GoDaddy and reset local changes, then redeploy from latest `main`. Never commit `<<<<<<<` conflict markers.

### GoDaddy Preview (must pass before Publish)

| Setting | Value |
|--------|--------|
| **Repository** | `wired38-gif/myk-hub` |
| **Branch** | `main` |
| **Application root / Source directory** (Git tab) | **blank** or `.` — not `sites/myk-hub` |
| **Root path** (app name tab) | **blank** — URL prefix only; unrelated to Git checkout |
| **Build command** | `npm run build` (or leave default — runs `node ./scripts/ensure-sites.js`) |
| **Start command** | `npm start` → `node server.js` |
| **Runtime** | **Node.js 18** (Settings → Runtime). Node 22 works locally but 18 matches `.node-version`. |
| **Env vars** | `PORT` is set by GoDaddy. Optional: `BRAIN_PROXY_*` for `/brain`. |

**Verify GitHub before redeploy:** open [raw package.json on main](https://raw.githubusercontent.com/wired38-gif/myk-hub/main/package.json) — you must see JSON with `"start": "node server.js"`.

**Deployment info must show a real GitHub commit** (e.g. `24104fb` or newer). If **Git commit** shows a short SHA that [does not exist on GitHub](https://github.com/wired38-gif/myk-hub/commits/main) (e.g. `e792b78`), the platform is stuck on a local merge artifact — preview will keep failing with `package.json` / `ensure-sites.js` ENOENT even when settings are correct.

**Fix phantom / stale platform commit (pick one):**

1. **Git reset (fastest):** Settings → **Git** → open shell / SSH if available → `git fetch origin && git checkout main && git reset --hard origin/main` → **Preview** → **Redeploy**.
2. **Reconnect Git:** Settings → **Git** → **Disconnect** → reconnect **`wired38-gif/myk-hub`** / **`main`**, application root blank → **Redeploy**.
3. **Recreate app:** delete the Node app, create a new one linked to the same repo (same env vars).
4. **Zip deploy:** zip repo **without** `node_modules/` (under 100MB) → upload → set start `npm start`.

There is **no** `prestart` script — `ensure-sites.js` runs only in **`npm run build`**, not again at start.

### Troubleshooting ENOENT `/app/package.json`

1. Confirm GoDaddy is linked to **`wired38-gif/myk-hub`**, not `Myks-Brain`. App display name **`myk_hub`** is fine; the GitHub slug is **`myk-hub`** (hyphen). Repo `wired38-gif/myk_hub` does not exist.
2. Application root must be **empty** or `.` — **not** `sites/myk-hub`, `sites/`, or any subfolder (those paths are from the monorepo on your Mac; this repo has `package.json` only at the root).
3. Branch **`main`**. Start: **`npm start`**. Build: **`npm run build`** or `node ./scripts/ensure-sites.js`.
4. Redeploy after changing repo or root path. If pull failed with merge conflicts, reset platform git state per [MERGE.md](./MERGE.md), then redeploy.
5. If **Git commit** on the deployment card is not on GitHub `main`, reset per **GoDaddy Preview** above — wrong cwd explains both `/app/package.json` and `/app/scripts/ensure-sites.js` ENOENT.
6. `airo-sandbox` warnings about missing `/git-repo` usually mean the Git checkout failed (wrong repo, branch, or root path).
