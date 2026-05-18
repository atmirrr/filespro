import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function I({ size = 16, ...p }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    />
  );
}

export const Folder = (p: IconProps) => (
  <I {...p}>
    <path d="M1.5 4.5a1 1 0 0 1 1-1h3.5l1.5 1.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7.5z" />
  </I>
);

export const FileIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M3.5 1.5h6.586a1 1 0 0 1 .707.293l2.914 2.914a1 1 0 0 1 .293.707V14.5a1 1 0 0 1-1 1h-9.5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" />
    <path d="M10 1.5V5a.5.5 0 0 0 .5.5H14" />
  </I>
);

export const Upload = (p: IconProps) => (
  <I {...p}>
    <path d="M8 11V2" />
    <path d="M4.5 5.5L8 2l3.5 3.5" />
    <path d="M2.5 14h11" />
  </I>
);

export const Download = (p: IconProps) => (
  <I {...p}>
    <path d="M8 2v9" />
    <path d="M4.5 7.5L8 11l3.5-3.5" />
    <path d="M2.5 14h11" />
  </I>
);

export const Trash = (p: IconProps) => (
  <I {...p}>
    <path d="M2.5 4h11" />
    <path d="M6 7v5" />
    <path d="M10 7v5" />
    <path d="M3.5 4l.5 9.5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1L12.5 4" />
    <path d="M6 4V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V4" />
  </I>
);

export const Plus = (p: IconProps) => (
  <I {...p}>
    <path d="M8 3.5v9" />
    <path d="M3.5 8h9" />
  </I>
);

export const Refresh = (p: IconProps) => (
  <I {...p}>
    <path d="M2.5 8a5.5 5.5 0 0 1 9.4-3.9l1.6 1.6" />
    <path d="M13.5 2v4h-4" />
    <path d="M13.5 8a5.5 5.5 0 0 1-9.4 3.9l-1.6-1.6" />
    <path d="M2.5 14v-4h4" />
  </I>
);

export const Settings = (p: IconProps) => (
  <I {...p}>
    <circle cx="8" cy="8" r="2" />
    <path d="M13 8a5 5 0 0 0-.1-1l1.4-1-1.4-2.4-1.7.5a5 5 0 0 0-1.7-1l-.4-1.7h-2.8l-.4 1.7a5 5 0 0 0-1.7 1l-1.7-.5L1.7 6l1.4 1A5 5 0 0 0 3 8a5 5 0 0 0 .1 1l-1.4 1 1.4 2.4 1.7-.5a5 5 0 0 0 1.7 1l.4 1.7h2.8l.4-1.7a5 5 0 0 0 1.7-1l1.7.5 1.4-2.4-1.4-1A5 5 0 0 0 13 8z" />
  </I>
);

export const Cross = (p: IconProps) => (
  <I {...p}>
    <path d="M3.5 3.5l9 9" />
    <path d="M12.5 3.5l-9 9" />
  </I>
);

export const Pencil = (p: IconProps) => (
  <I {...p}>
    <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z" />
  </I>
);

export const Copy = (p: IconProps) => (
  <I {...p}>
    <rect x="5" y="5" width="9" height="9" rx="1" />
    <path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2" />
  </I>
);

export const Link = (p: IconProps) => (
  <I {...p}>
    <path d="M7 9a3 3 0 0 0 4.243 0l2-2a3 3 0 1 0-4.243-4.243l-1 1" />
    <path d="M9 7a3 3 0 0 0-4.243 0l-2 2a3 3 0 1 0 4.243 4.243l1-1" />
  </I>
);

export const Chevron = (p: IconProps) => (
  <I {...p}>
    <path d="M6 4l4 4-4 4" />
  </I>
);

export const Home = (p: IconProps) => (
  <I {...p}>
    <path d="M2.5 7.5L8 2.5l5.5 5" />
    <path d="M3.5 7v6.5h9V7" />
  </I>
);

export const Search = (p: IconProps) => (
  <I {...p}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L13.5 13.5" />
  </I>
);

export const Eye = (p: IconProps) => (
  <I {...p}>
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
    <circle cx="8" cy="8" r="2" />
  </I>
);

export const ArrowRight = (p: IconProps) => (
  <I {...p}>
    <path d="M2.5 8h11" />
    <path d="M9 3.5L13.5 8 9 12.5" />
  </I>
);

export const ArrowLeft = (p: IconProps) => (
  <I {...p}>
    <path d="M13.5 8h-11" />
    <path d="M7 3.5L2.5 8 7 12.5" />
  </I>
);

export const FolderClosed = (p: IconProps) => (
  <I {...p} fill="currentColor" stroke="none">
    <path d="M2 5.25A1.25 1.25 0 0 1 3.25 4h2.96c.33 0 .65.13.88.36l.92.92c.23.23.55.36.88.36h4.86A1.25 1.25 0 0 1 15 6.89v5.86A1.25 1.25 0 0 1 13.75 14H3.25A1.25 1.25 0 0 1 2 12.75V5.25z" />
  </I>
);

export const CloudIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M4.5 13a3 3 0 0 1-.6-5.94A4.5 4.5 0 0 1 12.4 7.2a2.5 2.5 0 0 1 .1 5H4.5z" />
  </I>
);

export const ServerIcon = (p: IconProps) => (
  <I {...p}>
    <rect x="2.5" y="3" width="11" height="4" rx="1" />
    <rect x="2.5" y="9" width="11" height="4" rx="1" />
    <circle cx="5" cy="5" r="0.6" fill="currentColor" />
    <circle cx="5" cy="11" r="0.6" fill="currentColor" />
  </I>
);

export const Globe = (p: IconProps) => (
  <I {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M2.5 8h11" />
    <path d="M8 2.5c1.8 2 2.8 4.5 2.8 5.5s-1 3.5-2.8 5.5C6.2 11.5 5.2 9 5.2 8s1-3.5 2.8-5.5z" />
  </I>
);

export const ChevronDown = (p: IconProps) => (
  <I {...p}>
    <path d="M4 6l4 4 4-4" />
  </I>
);

export const GridIcon = (p: IconProps) => (
  <I {...p}>
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </I>
);

export const ListIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M2 3.5h12" />
    <path d="M2 8h12" />
    <path d="M2 12.5h12" />
  </I>
);

export const ImageIcon = (p: IconProps) => (
  <I {...p}>
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <circle cx="5.5" cy="6" r="1.2" />
    <path d="M2 11l3.5-3.5 4 4 1.5-1.5 3 3" />
  </I>
);
