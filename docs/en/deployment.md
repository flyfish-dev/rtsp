# Deployment

## Private Source Repository

```txt
flyfish-dev/rtsp-source
```

The source repository stays private for development, builds, and validation.

## Public Artifact Repository

```txt
flyfish-dev/rtsp
```

The public repository contains built artifacts, installers, static docs, and README only. Every update must create a GitHub Release.

```bash
npm run release:public
```

## Vercel Site

Build:

```bash
npm run build:site
```

Deploy prebuilt output:

```bash
npm run build:site
npm run build:vercel-output
vercel deploy /tmp/rtsp-vercel-prebuilt --prebuilt --prod --yes --project rtsp
```

Official domain:

```txt
https://rtsp.flyfish.dev
```

Compatibility alias:

```txt
https://rtsp-roan.vercel.app
```

Do not bind `doc.flyfish.dev` to this project.
