const paths = {
  data: (
    <>
      <path d="M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3-3.58 3-8 3-8-1.34-8-3Z" />
      <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
      <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </>
  ),
  insights: (
    <>
      <path d="M12 3a7 7 0 0 1 4 12c-1 .8-1.5 1.7-1.6 3H9.6c-.1-1.3-.6-2.2-1.6-3A7 7 0 0 1 12 3Z" />
      <path d="M9 21h6" />
      <path d="M9.5 16h5" />
    </>
  ),
  wins: (
    <>
      <path d="M7 4h10l-1.5 6a3.5 3.5 0 0 1-3.5 3h0A3.5 3.5 0 0 1 8.5 10L7 4Z" />
      <path d="M9 21h6" />
      <path d="M12 13v8" />
      <path d="M7 7H4l1 4h3" />
      <path d="M17 7h3l-1 4h-3" />
    </>
  ),
  fans: (
    <>
      <path d="M8 13a4 4 0 1 1 4-4 4 4 0 0 1-4 4Z" />
      <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z" />
      <path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M14 20c0-2.2 1.8-4 4-4s4 1.8 4 4" />
    </>
  ),
  titles: (
    <>
      <path d="M6 4h12l-1.5 6a5 5 0 0 1-5 4h-1a5 5 0 0 1-5-4L6 4Z" />
      <path d="M9 21h6" />
      <path d="M12 14v7" />
      <path d="m12 6 1 2 2 .3-1.5 1.5.4 2L12 10.8 10.1 12l.4-2L9 8.3 11 8l1-2Z" />
    </>
  ),
  legacy: (
    <>
      <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
      <path d="M12 8v8" />
      <path d="M8.5 12h7" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.36.7.66 1 .3.3.7.46 1.1.46H21v4h-.09a1.7 1.7 0 0 0-1.51.54Z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.8.7-1.7 1.3-1.7 2.7" />
      <path d="M12 17h.01" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  check: (
    <>
      <path d="m4 12 5 5L20 6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="m7 15 4-5 4 3 5-7" />
    </>
  ),
  automation: (
    <>
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <circle cx="12" cy="12" r="4" />
      <path d="m5.6 5.6 2.1 2.1" />
      <path d="m16.3 16.3 2.1 2.1" />
      <path d="m18.4 5.6-2.1 2.1" />
      <path d="m7.7 16.3-2.1 2.1" />
    </>
  ),
  bolt: (
    <>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  reset: (
    <>
      <path d="M4 4v6h6" />
      <path d="M20 20v-6h-6" />
      <path d="M20 9a8 8 0 0 0-14-4L4 10" />
      <path d="M4 15a8 8 0 0 0 14 4l2-5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </>
  ),
  upload: (
    <>
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M4 3h16" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m6 7 1 13h10l1-13" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </>
  ),
  play: (
    <>
      <path d="m8 5 11 7-11 7V5Z" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    </>
  )
};

export const Icon = ({ name, size = 20, className = '' }) => {
  const content = paths[name];
  if (!content) return null;
  return (
    <svg
      className={`icon ${className}`.trim()}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {content}
    </svg>
  );
};
