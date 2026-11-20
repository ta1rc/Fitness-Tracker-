import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: P) {
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
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IToday = (p: P) => (
  <Svg {...p}>
    <rect x="2.25" y="3" width="11.5" height="10.75" rx="2.25" />
    <path d="M2.25 6.5h11.5M5.5 1.75V4M10.5 1.75V4" />
    <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);
export const INutrition = (p: P) => (
  <Svg {...p}>
    <path d="M2 8.25h12a6 6 0 0 1-12 0Z" />
    <path d="M6 5.5c0-1 .8-1.25.8-2.25S6 2 6 2M9.25 5.5c0-1 .8-1.25.8-2.25S9.25 2 9.25 2" />
  </Svg>
);
export const ITraining = (p: P) => (
  <Svg {...p}>
    <path d="M5 8h6" />
    <rect x="2.75" y="4.5" width="2.25" height="7" rx="0.8" />
    <rect x="11" y="4.5" width="2.25" height="7" rx="0.8" />
    <path d="M1.25 6.5v3M14.75 6.5v3" />
  </Svg>
);
export const IBody = (p: P) => (
  <Svg {...p}>
    <rect x="2" y="2" width="12" height="12" rx="3" />
    <path d="M5.25 6.25a3.9 3.9 0 0 1 5.5 0L8.6 8.4" />
  </Svg>
);
export const ITrends = (p: P) => (
  <Svg {...p}>
    <path d="M2 13.5h12" />
    <path d="M2.5 10.5 6 7l2.5 2.25L13.5 4" />
    <path d="M10.75 4h2.75v2.75" />
  </Svg>
);
export const IGoals = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="6" />
    <circle cx="8" cy="8" r="3" />
    <circle cx="8" cy="8" r="0.6" fill="currentColor" />
  </Svg>
);
export const IPlus = (p: P) => (
  <Svg {...p}>
    <path d="M8 3v10M3 8h10" />
  </Svg>
);
export const IMinus = (p: P) => (
  <Svg {...p}>
    <path d="M3 8h10" />
  </Svg>
);
export const IChevL = (p: P) => (
  <Svg {...p}>
    <path d="M10 3.5 5.5 8l4.5 4.5" />
  </Svg>
);
export const IChevR = (p: P) => (
  <Svg {...p}>
    <path d="M6 3.5 10.5 8 6 12.5" />
  </Svg>
);
export const IChevD = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 6 8 10.5 12.5 6" />
  </Svg>
);
export const ISearch = (p: P) => (
  <Svg {...p}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="m10.5 10.5 3.25 3.25" />
  </Svg>
);
export const IStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <path d="m8 2 1.8 3.7 4 .6-2.9 2.8.7 4L8 11.2l-3.6 1.9.7-4L2.2 6.3l4-.6Z" />
  </Svg>
);
export const ITrash = (p: P) => (
  <Svg {...p}>
    <path d="M2.75 4.25h10.5M6.25 4.25V2.75h3.5v1.5M4 4.25l.6 8.6c.05.8.7 1.4 1.5 1.4h3.8c.8 0 1.45-.6 1.5-1.4l.6-8.6" />
  </Svg>
);
export const IClose = (p: P) => (
  <Svg {...p}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Svg>
);
export const ICheck = (p: P) => (
  <Svg {...p}>
    <path d="m3 8.5 3.25 3L13 4.5" />
  </Svg>
);
export const IDrop = (p: P) => (
  <Svg {...p}>
    <path d="M8 1.75s-4.5 5-4.5 8a4.5 4.5 0 0 0 9 0c0-3-4.5-8-4.5-8Z" />
  </Svg>
);
export const IMoon = (p: P) => (
  <Svg {...p}>
    <path d="M13.25 9.75A5.75 5.75 0 0 1 6.25 2.75a5.75 5.75 0 1 0 7 7Z" />
  </Svg>
);
export const ISteps = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 9.5c-1.3 0-2-1.4-2-3.25S3.4 2 4.75 2 6.75 3.6 6.5 5.5c-.15 1.25-.5 2.25-.25 4" />
    <path d="M3 11.75c.2 1.1.95 1.75 1.9 1.6.95-.15 1.35-.95 1.25-2" />
    <path d="M11.25 8c1.3 0 2.1-1.15 2.1-2.9 0-1.85-.95-3.35-2.2-3.35s-1.95 1.6-1.7 3.5c.15 1.2.55 1.75.3 2.75" />
    <path d="M9.7 10.25c-.2 1.1.15 2.05 1.1 2.25.95.2 1.6-.5 1.75-1.55" />
  </Svg>
);
export const IScale = (p: P) => (
  <Svg {...p}>
    <rect x="2" y="2" width="12" height="12" rx="3" />
    <path d="M5.25 6.25a3.9 3.9 0 0 1 5.5 0L8.6 8.4" />
  </Svg>
);
export const IFlame = (p: P) => (
  <Svg {...p}>
    <path d="M8 14.25c2.6 0 4.5-1.8 4.5-4.4 0-2.9-2.25-4.3-3-7.1-1.3 1-2 2.4-2 3.9-.8-.45-1.3-1.1-1.5-2C4.5 5.8 3.5 7.6 3.5 9.85c0 2.6 1.9 4.4 4.5 4.4Z" />
  </Svg>
);
export const IClock = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4.75V8l2.25 1.5" />
  </Svg>
);
export const ICopy = (p: P) => (
  <Svg {...p}>
    <rect x="5.25" y="5.25" width="8.5" height="8.5" rx="1.75" />
    <path d="M10.75 5.25V3.5c0-.7-.55-1.25-1.25-1.25h-6c-.7 0-1.25.55-1.25 1.25v6c0 .7.55 1.25 1.25 1.25h1.75" />
  </Svg>
);
export const IExport = (p: P) => (
  <Svg {...p}>
    <path d="M8 2v8M4.75 5.25 8 2l3.25 3.25" />
    <path d="M2.75 9.5v2.75c0 .8.7 1.5 1.5 1.5h7.5c.8 0 1.5-.7 1.5-1.5V9.5" />
  </Svg>
);
export const IEdit = (p: P) => (
  <Svg {...p}>
    <path d="M10.5 2.75 13.25 5.5 5.5 13.25H2.75V10.5Z" />
  </Svg>
);
export const IRepeat = (p: P) => (
  <Svg {...p}>
    <path d="M2.75 7.25V6.5a2.75 2.75 0 0 1 2.75-2.75h7.25" />
    <path d="m10.5 1.5 2.25 2.25-2.25 2.25" />
    <path d="M13.25 8.75v.75a2.75 2.75 0 0 1-2.75 2.75H3.25" />
    <path d="m5.5 14.5-2.25-2.25L5.5 10" />
  </Svg>
);
export const IBolt = (p: P) => (
  <Svg {...p}>
    <path d="M9 1.75 3.5 9h4l-1 5.25L12 7H8Z" />
  </Svg>
);
