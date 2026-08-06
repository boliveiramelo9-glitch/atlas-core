import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({
  children,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const LayoutDashboard = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </Icon>
);
export const ReceiptText = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Icon>
);
export const Boxes = (props: IconProps) => (
  <Icon {...props}>
    <path d="m7.5 4.3 4.5 2.6 4.5-2.6M3 8l4.5 2.6L12 8M12 8l4.5 2.6L21 8M7.5 10.6v5.2M16.5 10.6v5.2" />
    <path d="m3 8 4.5-2.6L12 8v5.2l-4.5 2.6L3 13.2V8ZM12 8l4.5-2.6L21 8v5.2l-4.5 2.6-4.5-2.6V8ZM7.5 15.8l4.5-2.6 4.5 2.6V21l-4.5 2.6L7.5 21v-5.2Z" />
  </Icon>
);
export const WalletCards = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 6h15a3 3 0 0 1 3 3v9H5a2 2 0 0 1-2-2V6Z" />
    <path d="M3 6V5a2 2 0 0 1 2-2h12v3M16 11h5" />
    <circle cx="16" cy="13" r=".8" fill="currentColor" stroke="none" />
  </Icon>
);
export const Bot = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="7" width="16" height="12" rx="3" />
    <path d="M12 3v4M8 12h.01M16 12h.01M8 16h8" />
  </Icon>
);
export const Settings = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
  </Icon>
);
export const ChevronRight = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);
export const Sparkles = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 3-1.2 3.3L7.5 7.5l3.3 1.2L12 12l1.2-3.3 3.3-1.2-3.3-1.2L12 3ZM5 14l-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8L5 14ZM18 13l-.8 2.2-2.2.8 2.2.8L18 19l.8-2.2 2.2-.8-2.2-.8L18 13Z" />
  </Icon>
);
export const PackageSearch = (props: IconProps) => (
  <Icon {...props}>
    <path d="m3 7 9 5 9-5-9-5-9 5Z" />
    <path d="M3 7v10l9 5 4-2.2M21 7v6" />
    <path d="M12 12v10M17.5 17.5l3 3M19 17a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
  </Icon>
);
export const MessageCircle = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9 9 0 0 1-4-.9L3 21l1.8-4.7A8.5 8.5 0 1 1 21 11.5Z" />
  </Icon>
);
export const CircleDollarSign = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8M12 6v12" />
  </Icon>
);
export const TrendingUp = (props: IconProps) => (
  <Icon {...props}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Icon>
);
export const Store = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 10V4h18v6M5 10v10h14V10" />
    <path d="M3 10a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2M9 20v-5h6v5" />
  </Icon>
);
export const ArrowUpRight = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 17 17 7M7 7h10v10" />
  </Icon>
);
export const ArrowDownLeft = (props: IconProps) => (
  <Icon {...props}>
    <path d="M17 7 7 17M17 17H7V7" />
  </Icon>
);
export const Menu = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);
