import React from "react";
import type { AdapterKind } from "@shared/types";
import { FolderClosed } from "./icons";

/**
 * Brand-accurate logos for each adapter. Each entry returns an SVG whose
 * viewBox is 0..24 and whose default fills look correct against a white
 * background. The `BrandLogo` wrapper renders them at any size and lets the
 * caller decide whether to draw a colored "rounded-square" badge around them.
 */

interface BrandSpec {
  /** Background of the colored badge (used when `badge` is enabled). */
  badgeBg: string;
  /** Optional gradient stop for the badge. */
  badgeBg2?: string;
  /** The SVG content. Should be sized to fit a 24x24 viewBox. */
  glyph: React.ReactNode;
  /** Whether the glyph should be inverted to white when on a colored badge.  */
  glyphOnBadge: "white" | "color";
}

const LOGOS: Record<AdapterKind, BrandSpec> = {
  fs: {
    badgeBg: "#3478F6",
    badgeBg2: "#1F66E0",
    glyphOnBadge: "white",
    glyph: (
      <path
        d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l1.7 1.7c.28.28.66.43 1.06.43h8.24A1.5 1.5 0 0 1 21 9.63v8.87A1.5 1.5 0 0 1 19.5 20H4.5A1.5 1.5 0 0 1 3 18.5v-11z"
        fill="currentColor"
      />
    ),
  },

  s3: {
    // Amazon S3 — simplified "bucket" inspired by the AWS S3 icon
    badgeBg: "#FF9900",
    badgeBg2: "#E67E00",
    glyphOnBadge: "white",
    glyph: (
      <>
        <path
          d="M5.2 5.5l6.8-2.4 6.8 2.4v3.2l-6.8 1.5L5.2 8.7V5.5z"
          fill="currentColor"
          opacity="0.55"
        />
        <path
          d="M5.2 8.7l6.8 1.5 6.8-1.5V18l-6.8 2.5L5.2 18V8.7z"
          fill="currentColor"
        />
        <path d="M12 10.2v10.3" stroke="rgba(0,0,0,0.18)" strokeWidth="0.6" />
      </>
    ),
  },

  r2: {
    // Cloudflare R2 — orange cloud with double-arc echoing the Cloudflare wordmark
    badgeBg: "#F38020",
    badgeBg2: "#D45F12",
    glyphOnBadge: "white",
    glyph: (
      <>
        <path
          d="M19.4 14.4c.6-.2 1.1-.8 1.1-1.5 0-.9-.7-1.6-1.6-1.6h-.2c-.3-2.4-2.3-4.3-4.8-4.3-2.1 0-3.9 1.3-4.6 3.2-.5-.2-1-.3-1.5-.3-2.1 0-3.8 1.7-3.8 3.8 0 .3 0 .5.1.8h15.3z"
          fill="currentColor"
        />
        <text
          x="12"
          y="20.5"
          fontFamily="-apple-system, system-ui"
          fontSize="4.6"
          fontWeight="700"
          textAnchor="middle"
          fill="currentColor"
        >
          R2
        </text>
      </>
    ),
  },

  gcs: {
    // Google Cloud Storage — bucket with multi-stripe Google colors
    badgeBg: "#4285F4",
    badgeBg2: "#1A73E8",
    glyphOnBadge: "white",
    glyph: (
      <>
        <path
          d="M5.5 6h13l-1 13.5a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9L5.5 6z"
          fill="currentColor"
        />
        <rect x="6.5" y="9.5" width="11" height="1.4" fill="#34A853" />
        <rect x="6.7" y="11.8" width="10.6" height="1.4" fill="#FBBC04" />
        <rect x="6.9" y="14.1" width="10.2" height="1.4" fill="#EA4335" />
      </>
    ),
  },

  azure: {
    // Microsoft Azure — clean blue A-mark
    badgeBg: "#0078D4",
    badgeBg2: "#005A9E",
    glyphOnBadge: "white",
    glyph: (
      <>
        <path d="M10.5 4.5h3l5.5 13.5h-4L13 13.5 8.5 18H4l6.5-13.5z" fill="currentColor" />
        <path d="M8 18h6.5l-2-4L8 18z" fill="rgba(0,0,0,0.15)" />
      </>
    ),
  },

  minio: {
    // MinIO — red M
    badgeBg: "#C72E29",
    badgeBg2: "#9B201C",
    glyphOnBadge: "white",
    glyph: (
      <path
        d="M5 19V5h2.5l4.5 8 4.5-8H19v14h-2.6V9.6L12 17.4 7.6 9.6V19H5z"
        fill="currentColor"
      />
    ),
  },

  "digitalocean-spaces": {
    // DigitalOcean — DO inside a circle
    badgeBg: "#0080FF",
    badgeBg2: "#0061BF",
    glyphOnBadge: "white",
    glyph: (
      <>
        <path
          d="M12 22c-5.5 0-10-4.5-10-10S6.5 2 12 2s10 4.5 10 10v3.4h-3.4V12c0-3.6-3-6.6-6.6-6.6S5.4 8.4 5.4 12 8.4 18.6 12 18.6V22z"
          fill="currentColor"
        />
        <rect x="13" y="13" width="4" height="4" fill="currentColor" />
      </>
    ),
  },

  storj: {
    // Storj — violet hexagon storage shard
    badgeBg: "#2683FF",
    badgeBg2: "#1F69CC",
    glyphOnBadge: "white",
    glyph: (
      <>
        <path
          d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"
          fill="currentColor"
          opacity="0.5"
        />
        <path
          d="M12 7l5 2.7v4.6L12 17l-5-2.7V9.7L12 7z"
          fill="currentColor"
        />
      </>
    ),
  },

  hetzner: {
    // Hetzner — red square H
    badgeBg: "#D50C2D",
    badgeBg2: "#A2071F",
    glyphOnBadge: "white",
    glyph: (
      <path
        d="M6 4h2.6v7.2h6.8V4H18v16h-2.6v-7.2H8.6V20H6V4z"
        fill="currentColor"
      />
    ),
  },

  akamai: {
    // Akamai — orange torus/wave
    badgeBg: "#019DD7",
    badgeBg2: "#0077A6",
    glyphOnBadge: "white",
    glyph: (
      <path
        d="M12 3a9 9 0 1 0 9 9 .5.5 0 0 0-1 0 8 8 0 1 1-8-8 .5.5 0 0 0 0-1zm0 4a5 5 0 1 0 5 5 .5.5 0 0 0-1 0 4 4 0 1 1-4-4 .5.5 0 0 0 0-1z"
        fill="currentColor"
      />
    ),
  },

  "vercel-blob": {
    // Vercel — black triangle
    badgeBg: "#000000",
    badgeBg2: "#1A1A1A",
    glyphOnBadge: "white",
    glyph: <path d="M12 3l10 18H2L12 3z" fill="currentColor" />,
  },

  "netlify-blobs": {
    // Netlify — teal flag/swoosh approximation
    badgeBg: "#00C7B7",
    badgeBg2: "#009E92",
    glyphOnBadge: "white",
    glyph: (
      <>
        <path
          d="M11 3L4 10v4l7 7h2l7-7v-4l-7-7h-2zm1 4l5 5-5 5-5-5 5-5z"
          fill="currentColor"
        />
      </>
    ),
  },

  supabase: {
    // Supabase — green lightning bolt
    badgeBg: "#3ECF8E",
    badgeBg2: "#2BA56B",
    glyphOnBadge: "white",
    glyph: (
      <path
        d="M13 2L4 13h7v9l9-11h-7V2z"
        fill="currentColor"
      />
    ),
  },

  uploadthing: {
    // UploadThing — pink upload arrow
    badgeBg: "#E91E63",
    badgeBg2: "#AD1457",
    glyphOnBadge: "white",
    glyph: (
      <>
        <path d="M12 4l-7 7h4v6h6v-6h4l-7-7z" fill="currentColor" />
        <rect x="5" y="19" width="14" height="1.6" rx="0.8" fill="currentColor" />
      </>
    ),
  },

  dropbox: {
    // Dropbox — blue origami
    badgeBg: "#0061FF",
    badgeBg2: "#0045B8",
    glyphOnBadge: "white",
    glyph: (
      <>
        <path d="M7 4L2.5 7.5 7 11l5-3.5L7 4z" fill="currentColor" />
        <path d="M17 4L12 7.5 17 11l4.5-3.5L17 4z" fill="currentColor" />
        <path d="M2.5 14.5L7 18l5-3.5L7 11l-4.5 3.5z" fill="currentColor" />
        <path d="M17 11l-5 3.5L17 18l4.5-3.5L17 11z" fill="currentColor" />
        <path d="M7 19l5 3.2L17 19l-5-3.5L7 19z" fill="currentColor" />
      </>
    ),
  },

  onedrive: {
    // OneDrive — cyan three-puff cloud
    badgeBg: "#0078D4",
    badgeBg2: "#005A9E",
    glyphOnBadge: "white",
    glyph: (
      <path
        d="M6.8 18.5c-2.3 0-4.1-1.8-4.1-4.1 0-2 1.5-3.7 3.4-4 .5-2.4 2.6-4.2 5.1-4.2 2 0 3.8 1.2 4.6 3a3.5 3.5 0 0 1 4.7 3.3c0 .6-.2 1.2-.4 1.7.7.4 1.2 1.2 1.2 2.1 0 1.3-1 2.3-2.3 2.3H6.8z"
        fill="currentColor"
      />
    ),
  },

  "google-drive": {
    // Google Drive — tri-color triangle
    badgeBg: "#FFFFFF",
    glyphOnBadge: "color",
    glyph: (
      <>
        <path d="M7.5 4L2 14l3 5 5.5-10L7.5 4z" fill="#0066DA" />
        <path d="M16.5 4h-9l5.5 10h9L16.5 4z" fill="#FBBC04" />
        <path d="M22 14l-3 5H10.5L13 14h9z" fill="#34A853" />
        <path d="M10.5 19h9L22 14h-9l-2.5 5z" fill="#188038" />
        <path d="M5 19h5.5L13 14H7.5L5 19z" fill="#1967D2" />
        <path d="M16.5 4L13 14h9L16.5 4z" fill="#EA4335" />
      </>
    ),
  },

  box: {
    // Box — blue "B"
    badgeBg: "#0061D5",
    badgeBg2: "#003F8A",
    glyphOnBadge: "white",
    glyph: (
      <path
        d="M7 5h5a3.5 3.5 0 0 1 2.4 6.1A3.7 3.7 0 0 1 12.5 18H7V5zm2.4 2.2v3.4h2.4a1.7 1.7 0 1 0 0-3.4H9.4zm0 5.6v3h3.1a1.5 1.5 0 1 0 0-3H9.4z"
        fill="currentColor"
      />
    ),
  },
};

function spec(kind: string): BrandSpec {
  return LOGOS[kind as AdapterKind] ?? LOGOS.fs;
}

/** A logo with a colored rounded-square badge behind it. Used in the home grid tiles. */
export function BrandTile({ kind, size = 56 }: { kind: string; size?: number }) {
  const s = spec(kind);
  const radius = Math.round(size * 0.26);
  const glyphSize = Math.round(size * 0.66);
  const onColor = s.glyphOnBadge === "white" ? "#FFFFFF" : undefined;
  const isFolder = kind === "fs";
  return (
    <div
      className="flex items-center justify-center shadow-sm"
      style={{
        height: size,
        width: size,
        borderRadius: radius,
        background: s.badgeBg2
          ? `linear-gradient(135deg, ${s.badgeBg} 0%, ${s.badgeBg2} 100%)`
          : s.badgeBg,
        color: onColor,
        border:
          s.glyphOnBadge === "color"
            ? "1px solid rgba(0,0,0,0.08)"
            : undefined,
      }}
    >
      {isFolder ? (
        <FolderClosed size={Math.round(size * 0.55)} className="text-white" />
      ) : (
        <svg
          width={glyphSize}
          height={glyphSize}
          viewBox="0 0 24 24"
          style={{ color: onColor }}
        >
          {s.glyph}
        </svg>
      )}
    </div>
  );
}

/** Inline color-only logo used in small sidebar chips. Renders as a 16x16 rounded chip. */
export function BrandChipInline({ kind, size = 16 }: { kind: string; size?: number }) {
  const s = spec(kind);
  const radius = Math.round(size * 0.26);
  const glyphSize = Math.round(size * 0.78);
  const onColor = s.glyphOnBadge === "white" ? "#FFFFFF" : undefined;
  const isFolder = kind === "fs";
  return (
    <span
      className="shrink-0 flex items-center justify-center"
      style={{
        height: size,
        width: size,
        borderRadius: radius,
        background: s.badgeBg2
          ? `linear-gradient(135deg, ${s.badgeBg}, ${s.badgeBg2})`
          : s.badgeBg,
        color: onColor,
        border:
          s.glyphOnBadge === "color"
            ? "1px solid rgba(0,0,0,0.12)"
            : undefined,
      }}
    >
      {isFolder ? (
        <FolderClosed size={Math.round(size * 0.7)} className="text-white" />
      ) : (
        <svg width={glyphSize} height={glyphSize} viewBox="0 0 24 24" style={{ color: onColor }}>
          {s.glyph}
        </svg>
      )}
    </span>
  );
}

