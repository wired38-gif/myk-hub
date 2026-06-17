# GoDaddy myk-hub — nuclear reset when Git pull won't refresh

## Preview vs Publish — two different pipelines

GoDaddy Node PaaS runs **different code paths** for Preview/Pull vs Publish. Your logs show this clearly:

| | **Publish (works)** | **Preview / Git pull (fails)** |
|---|---------------------|--------------------------------|
| Archive | Extracts `/dist/current` (~58–59 MB) → `/app` | **No** archive extraction lines |
| `node_modules` | Present → **skip** `npm install` + build | `airo-sandbox`: `/app/node_modules` **missing** |
| Start | `prestart` / `ensure-sites` OK → `node server.js` on `PORT` | `ENOENT` `/app/package.json` or `/app/scripts/ensure-sites.js` |
| Sites | Real `sites/*/index.html` served | Sometimes stub sites, then `ENOENT` on `sites/myk/index.html` |

**Bottom line:** A **published** deploy can be healthy while **Preview** keeps failing. That is expected until `/app` is populated the same way Publish does (archive extract or full zip upload).

### What to do

1. **Skip Preview — Publish the last good deploy** if Deployment info already shows a working commit and live `https://myk.ac/health` is OK. Preview is not required for production.
2. **OR upload a Publish-style zip** (includes `node_modules`; typically ~58–80 MB depending on site assets) via the manual upload / Publish path — see **Path A** below. This matches the working archive flow.
3. **Do not expect Git Pull / Preview alone to fix an empty sandbox.** Until GoDaddy extracts an archive or you reset `/app` (Path B/C), Preview will keep showing `airo-sandbox` + ENOENT even when GitHub `main` is correct.

`.airo/config.json` lives on GoDaddy's platform (not in this repo). Local source of truth: `.godaddy` (start/build commands) + `scripts/build-godaddy-zip.sh`.

---

Use the reset paths below when **Deployment info → Git commit** shows a SHA that **does not exist on GitHub** (e.g. `e792b78`) and Preview keeps failing with:

```text
ENOENT: no such file or directory, open '/app/package.json'
ENOENT: ... '/app/scripts/ensure-sites.js'
```

That means GoDaddy's `/app` checkout is **empty or conflicted**. Pushing more commits to GitHub or clicking **Pull** again will **not** fix it until the platform filesystem is replaced.

**GitHub truth (verify first):** [wired38-gif/myk-hub `main`](https://github.com/wired38-gif/myk-hub) should be current. Root must include `package.json`, `server.js`, `scripts/`, `sites/` (real `index.html` for myk/lti/pate), `config/`, `.godaddy`, `vite.config.js`.

---

## Do this RIGHT NOW (pick one path)

### Path A — Zip upload (fastest, bypasses broken Git) ⭐

1. On your Mac, rebuild the **Publish-style** zip (runs `npm ci`, bundles `node_modules`):
   ```bash
   cd ~/Desktop/myks-app/sites/myk-hub
   bash scripts/build-godaddy-zip.sh
   # → dist/myk-hub-deploy.zip (~58-80 MB) and /tmp/myk-hub-deploy-<sha>.zip
   ```
2. GoDaddy → **myk_hub** (or your Node app) → **Settings** → **Deployment** (or **Upload** / **Manual deploy** if shown).
3. Upload **`dist/myk-hub-deploy.zip`** through the **Publish / upload** path (max **~100 MB** on GoDaddy Node; bundle is typically ~58–80 MB with `node_modules` + site assets).
4. Set:
   | Setting | Value |
   |---------|--------|
   | **Build command** | `npm run build` |
   | **Start command** | `npm start` |
   | **Node runtime** | **18** |
   | **Application root** | blank / `.` |
5. Re-enter env vars below → **Publish** (Preview optional — see **Preview vs Publish** above).

Zip contents: everything above **plus** `node_modules/` from `npm ci` (matches Publish archive — platform skips install/build). **No** `.env`.

If the UI has no zip upload, use **Path B** (delete + recreate with Git) or **Path C** (SSH wipe).

---

### Path B — Delete app, recreate (clean Git checkout)

1. **Screenshot / copy env vars** (see table below).
2. GoDaddy → **Node.js** → delete the stuck app (**myk_hub**).
3. **Create new Node.js app** → connect Git:
   | Setting | Value |
   |---------|--------|
   | **Repository** | `wired38-gif/myk-hub` (hyphen — **not** `myk_hub`) |
   | **Branch** | `main` **or** tag `v1.0.0-godaddy` |
   | **Application root / Source directory** | **blank** or `.` — **never** `sites/myk-hub` |
   | **Build** | `npm run build` |
   | **Start** | `npm start` |
   | **Node** | **18** |
4. Paste env vars → attach domains (myk.ac, etc.) → **Preview**.
5. Confirm **Git commit** = real GitHub SHA (`c7dae1e+`), not `e792b78`.

---

### Path C — SSH hard wipe + fresh clone

Only if GoDaddy gives you a shell into the app (Settings → Git → SSH / Terminal):

```bash
cd /app
rm -rf ./* ./.[!.]* 2>/dev/null || true
git clone --depth 1 --branch main https://github.com/wired38-gif/myk-hub.git .
# or: git clone --depth 1 --branch v1.0.0-godaddy ...
test -f package.json && test -f scripts/ensure-sites.js && echo OK
npm install
npm run build
```

Then **Redeploy** from the dashboard. If `git pull` still shows phantom SHAs, prefer Path A or B.

---

### Path D — SSH git reset (if clone not allowed)

```bash
cd /app
git fetch origin
git checkout main
git reset --hard origin/main
git clean -fdx
test -f package.json && npm run build
```

If `git status` shows merge conflicts on `vite.config.js`, reset still wins — do **not** commit conflict markers on the server.

---

## Environment variables to copy

Set these on **Settings → Environment variables** before Publish:

| Variable | Value | Notes |
|----------|--------|--------|
| `PORT` | *(auto)* | GoDaddy sets this — do not override unless docs say so |
| `BRAIN_PROXY_ENABLED` | `1` | Enables `/brain` proxy |
| `BRAIN_PROXY_TARGET` | `https://cameron-females-livestock-collecting.trycloudflare.com` | **Update when quick tunnel rotates** — run `bash scripts/update-brain-proxy-target.sh` on Mac |
| `BRAIN_PROXY_PREFIX` | `/brain` | Path on myk.ac |

`BRAIN_PROXY_TARGET` in GoDaddy **overrides** `config/brain-proxy-target.json` in the repo. After changing the tunnel URL on your Mac, update **both** the JSON (git push) **and** GoDaddy env, then redeploy.

Verify after deploy:

```bash
curl -sS https://myk.ac/health
curl -sS https://myk.ac/brain/api/status
```

---

## Duplicate apps: `myk_hub` vs `myk-hub`

| Name | What it is |
|------|------------|
| **myk_hub** | GoDaddy **display name** (underscore) — fine |
| **myk-hub** | GitHub repo slug (hyphen) — **must** be `wired38-gif/myk-hub` |
| **myk_hub repo** | Does **not** exist on GitHub — wrong remote |

**Check:** GoDaddy → Node.js apps list. You should have **one** app serving myk.ac. If two exist (old + new), delete the one whose **Git commit** is phantom or whose Preview fails. Keeping two apps pointing at the same domain causes confusion about which deploy is live.

**Wrong repo symptom:** connected to `Myks-Brain` / `myks-app` monorepo → `/app/package.json` ENOENT because hub files live in a **separate** repo at root.

---

## Optional: deploy from tag or branch (clean pointer)

If Git sync keeps sticking on phantom commits:

1. Point GoDaddy branch to tag **`v1.0.0-godaddy`** (annotated, tracks `main` at release).
2. Or branch **`godaddy-deploy`** — same tree as `main`, empty merge history on platform side when first connected.

Tags/branches do **not** fix a corrupted `/app` by themselves — still use Path A/B/C once, then Git pulls should work.

---

## Verify success

| Check | Expected |
|-------|----------|
| Deployment **Git commit** | `c7dae1e` or newer, [exists on GitHub](https://github.com/wired38-gif/myk-hub/commits/main) |
| Preview build log | With zip Publish: skip install (node_modules present) or `ensure-sites.js` OK |
| Preview start | Optional — **Publish** is what matters for live traffic |
| Live | `https://myk.ac/health` → JSON `ok: true` |

---

## Rebuild zip locally

```bash
cd ~/Desktop/myks-app/sites/myk-hub
bash scripts/build-godaddy-zip.sh
open dist/   # myk-hub-deploy.zip
```

See also: [MERGE.md](../MERGE.md) (vite.config.js conflicts), [README.md](../README.md) (settings table).
