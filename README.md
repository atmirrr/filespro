# FilesPro

> Your S3, R2, Drive, Dropbox and 30 more, in one native Mac app.

A Finder-style macOS file manager that connects to your local folders and 31 cloud storage providers. Drag a file from Desktop into an S3 bucket, copy from Dropbox to R2, download a whole folder as a ZIP, peek at a PDF in a Supabase bucket with Quick Look. All in one window.

## Supported sources

Local filesystem · Amazon S3 · Cloudflare R2 · Google Cloud Storage · Azure Blob · MinIO · DigitalOcean Spaces · Storj · Hetzner Object Storage · Akamai NetStorage · Vercel Blob · Netlify Blobs · UploadThing · Supabase Storage · Dropbox · OneDrive · Google Drive · Box · Backblaze B2 · Wasabi · Tigris · Scaleway · Vultr · OVHcloud · IDrive e2 · Filebase · Exoscale · Oracle Cloud · IBM COS · Tencent COS · Alibaba OSS · Yandex Object Storage

## Install

Grab the DMG from [Releases](https://github.com/atmirrr/filespro/releases/latest) and drag FilesPro into Applications.

First launch shows the unsigned-app warning. Right-click the app, choose Open, then confirm.

## Build from source

```bash
git clone https://github.com/atmirrr/filespro
cd filespro
npm ci
npm run dev          # hot-reload dev
npm run dist:mac     # builds the .app + DMG (arm64)
```

Requires Node 20+ and macOS.

## License

MIT.
