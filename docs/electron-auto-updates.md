# Electron auto-updates (GitHub Releases)

Simple POS uses `electron-updater` + `electron-builder` with the **GitHub provider**.

## How it works

- CI builds the Electron app installers on release creation.
- `electron-builder` uploads update artifacts to the GitHub Release.
- The packaged app checks GitHub Releases periodically and downloads updates.

## Requirements

- Releases must be created in the repo: `haqadn/simple-pos`
- GitHub Actions must be enabled

### Important note about macOS

For broad macOS distribution, you typically need:
- Apple Developer ID signing
- Notarization

This repo is currently configured to build **unsigned** macOS artifacts in CI. They may trigger Gatekeeper warnings on end-user machines.

## Repo configuration

### 1) `package.json`

Ensure:

- `build.publish` points at the correct repo:

```json
"publish": [
  { "provider": "github", "owner": "haqadn", "repo": "simple-pos" }
]
```

- `repository.url` is set so tooling can infer the repo:

```json
"repository": { "type": "git", "url": "https://github.com/haqadn/simple-pos.git" }
```

### 2) Main process updater

`electron/main.js` wires `electron-updater` to:
- `checkForUpdatesAndNotify()` at startup (packaged builds only)
- re-check every 4 hours

## CI: building + publishing releases

GitHub Actions workflow: `.github/workflows/build.yaml`

On `release: created` it:
- builds on **Windows** and **macOS**
- runs `electron-builder --publish always`
- uses `GH_TOKEN=${{ secrets.GITHUB_TOKEN }}` (the built-in token) to upload assets

## Release process (developer)

1. Bump version in `package.json` (Electron auto-update relies on semantic versions)
2. Merge to `main`
3. Create a GitHub Release (tag like `v0.1.1`)
4. Wait for GitHub Actions to finish
5. Install the app and verify:
   - it logs "Checking for updates..."
   - it can download an update from a newer Release

## Troubleshooting

- If updates aren’t found:
  - confirm the Release has the `.yml` / `.json` latest metadata and platform assets uploaded by electron-builder
  - confirm the app is packaged (`app.isPackaged === true`)
  - confirm the repo is reachable (private repos require auth)

- If the repo is private:
  - easiest: make releases public or use a generic provider + your own update server
  - `electron-updater` can be configured with tokens, but avoid embedding secrets in the app
