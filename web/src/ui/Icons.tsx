export type IconName =
  | "dashboard"
  | "studio"
  | "library"
  | "cmgd"
  | "templates"
  | "download"
  | "arrow"
  | "plus"
  | "search"
  | "logout"
  | "chevron"
  | "document"
  | "check"
  | "clock"
  | "close";
const paths: Record<IconName, string> = {
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  studio:
    "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M17 3l4 4-10 10-5 1 1-5z M15 5l4 4",
  library: "M3 7h18v14H3z M2 3h20v4H2z M9 11h6",
  cmgd: "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M7 3v4 M17 3v4 M3 11h18 M8 16l3 3 5-5",
  templates: "M8 3h12v15H8z M4 7v14h12 M11 7h6 M11 11h6",
  download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  plus: "M12 5v14 M5 12h14",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  logout: "M9 4H4v16h5 M9 12h12 M16 7l5 5-5 5",
  chevron: "M14 6l-6 6 6 6",
  document: "M14 2H5v20h14V7z M14 2v6h5 M8 12h8 M8 16h6",
  check: "M5 12l4 4L19 6",
  clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  close: "M6 6l12 12 M18 6 6 18",
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
