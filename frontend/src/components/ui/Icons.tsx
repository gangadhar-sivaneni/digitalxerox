import type { ReactNode } from "react";

interface IconProps {
  className?: string;
  children: ReactNode;
}

/** Renders an inline SVG using the design's stroke style (class "ico"). */
export function Icon({ className = "ico", children }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const ArrowIcon = (
  <Icon>
    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

export const PlusIcon = (
  <Icon>
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </Icon>
);

export const UploadIcon = (
  <Icon>
    <path d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

export const ClockIcon = (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

export const HistoryIcon = (
  <Icon>
    <path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.4M3 4v3.4h3.4M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

export const BellIcon = (
  <Icon>
    <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

export const CloseIcon = (
  <Icon>
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
  </Icon>
);

export const SearchIcon = (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
  </Icon>
);

export const LogoutIcon = (
  <Icon>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

export const SpyglassIcon = ClockIcon;