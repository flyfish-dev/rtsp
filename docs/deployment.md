# Deployment

## GitHub

The repository is intended to be published as `rtsp`.

Recommended release assets:

- Chrome extension directory or packaged CRX.
- Native runtime binaries for macOS, Linux, and Windows.
- One-click installers from `release/installers/`, including the macOS graphical DMG.
- SDK package from `packages/rtsp-sdk`.
- Documentation site from `site/`.

## Vercel Site

The project includes a Vite-powered documentation site:

```txt
site/
```

Vercel configuration:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "site/dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

Local build:

```bash
npm install
npm run build
```

Production deployment:

```bash
vercel deploy --prod
```

This project deploys the already-built static site from `site/dist`:

```bash
npm run build:site
vercel deploy site/dist --prod --yes
vercel alias set <deployment-url> rtsp-roan.vercel.app
```

## Public Artifact Repository

The public repository `flyfish-dev/rtsp` contains built artifacts only. Every
public update must also create a GitHub Release with installer assets.

Recommended command:

```bash
npm run release:public
```

The script force-publishes the artifact repository, creates a timestamped tag,
and attaches:

- `rtsp-macos-installer.dmg`
- `rtsp-macos-installer.zip`
- `rtsp-windows-installer.zip`
- `rtsp-linux-installer.tar.gz`

Use `PUBLIC_RELEASE_TAG` to pin the release tag:

```bash
PUBLIC_RELEASE_TAG=v0.1.0-20260526 npm run release:public
```

## Native Runtime Distribution

Build the native runtime:

```bash
./scripts/build.sh
```

Cross-build examples:

```bash
GOOS=linux GOARCH=amd64 ./scripts/build.sh
GOOS=darwin GOARCH=arm64 ./scripts/build.sh
GOOS=windows GOARCH=amd64 ./scripts/build.sh
```

## Versioning

Keep these versions aligned:

- `extension/manifest.json`
- `packages/rtsp-sdk/package.json`
- `native/cmd/rtsp-web-native/main.go`
- Docs site release notes
