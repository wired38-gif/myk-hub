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
| **Node version** | 18+ (see `.node-version`) |

Do **not** set the source directory to `sites/`, `sites/myk-hub`, or any subfolder — `package.json` and `server.js` live at the **repository root**.

If you connected the parent monorepo (`Myks-Brain`), GoDaddy will not find `package.json` at `/app` because `sites/` is not tracked there. Reconnect this repo instead.

### Required env (optional Brain proxy)

| Variable | Example | Purpose |
|----------|---------|---------|
| `PORT` | *(set by GoDaddy)* | App listen port |
| `BRAIN_PROXY_ENABLED` | `1` | Enable `/brain` proxy |
| `BRAIN_PROXY_TARGET` | `https://your-tunnel.example` | Gateway URL |
| `BRAIN_PROXY_PREFIX` | `/brain` | URL prefix |

### Local run

```bash
npm install
npm start
# http://localhost:20010 (set PORT to override)
```

### Troubleshooting Vite auto-detect

If deploy logs mention **vite** or **vite build** but this app is plain Express, remove  from the repo. Hostname allowlist lives in  ().

### Troubleshooting ENOENT `/app/package.json`

1. Confirm GoDaddy is linked to **`wired38-gif/myk-hub`**, not `Myks-Brain`.
2. Application root must be **empty** or `.` — not a subdirectory.
3. Redeploy after changing repo or root path.
4. `airo-sandbox` warnings about missing `/git-repo` usually mean the Git checkout failed (wrong repo, branch, or root path).
