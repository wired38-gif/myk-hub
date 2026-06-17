# GoDaddy Git pull — merge conflicts

## Root cause

GoDaddy Node.js PaaS **edits `vite.config.js` on the server** for hostname routing. If GitHub `main` deletes, reformats, or re-adds that file differently, the platform `git pull` hits:

1. **modify/delete** — e.g. commit `e13962e` removed `vite.config.js` while the platform still had a local copy.
2. **add/add** — platform recreated `vite.config.js` locally while `main` also added a different version (comments/multiline vs one line).

Until the platform repo is out of conflict state, **new commits on GitHub do not deploy**.

### Phantom commit (e.g. `e792b78` not on GitHub)

If **Deployment info → Git commit** shows a short SHA that returns 404 on GitHub, GoDaddy never checked out `origin/main` — it is serving a **local platform commit** from a failed merge. Preview fails with ENOENT for `/app/package.json` and `/app/scripts/ensure-sites.js` because `/app` is empty or conflicted. **Hard reset** (method A below) or **disconnect/reconnect Git** is required; pushing more commits to GitHub alone will not fix preview until the platform resets.

## Fix on the platform (pick one)

### A. Hard reset (recommended)

In the GoDaddy app **Git / SSH** shell (repo root):

```bash
git fetch origin
git checkout main
git reset --hard origin/main
```

Then trigger **Redeploy** in the GoDaddy dashboard.

### B. Resolve `vite.config.js` only

If status shows unmerged `vite.config.js`:

```bash
git fetch origin
git checkout --theirs vite.config.js   # use GitHub main version when pulling
git add vite.config.js
git commit -m "resolve merge conflicts"
git merge origin/main
```

Use `--ours` instead of `--theirs` only if GoDaddy docs say the platform branch is "theirs" (if pull still fails, use method A).

## Keep `main` merge-safe

- **Do not delete** `vite.config.js` from `main`.
- Keep **`server.allowedHosts`** in `vite.config.js` identical to **`.godaddy`** `allowedHosts` (same hosts, same order).
- Keep `vite.config.js` as a **single-line** `module.exports = { server: { allowedHosts: [...] }, preview: { allowedHosts: true } };` so add/add merges auto-resolve when content matches.

## Verify

```bash
git status -sb
test ! -f vite.config.js || ! grep -q '^<<<<<<<' vite.config.js
npm run build && node --check server.js
```
