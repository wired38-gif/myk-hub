# CLAUDE.md — GoDaddy Node.js Hosting

This app deploys to GoDaddy Node.js PaaS from **repo root** (`wired38-gif/myk-hub`).

## Requirements

- `package.json` at repository root with `"start": "node server.js"`
- `server.js` listens on `process.env.PORT` and host `0.0.0.0`
- Dependencies in `"dependencies"` (not devDependencies)
- Do not commit `node_modules/` or `.env`

## Structure

```
package.json
server.js
sites/myk/index.html
sites/pate/index.html
sites/lti/index.html
.godaddy
.node-version
```

## Deploy settings

Connect GitHub repo `wired38-gif/myk-hub`, branch `main`, application root empty (`.`).

Do not deploy from the `Myks-Brain` monorepo — its `sites/` folder is not on GitHub.
