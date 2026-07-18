import type { SVGProps } from "react";

export type IconName =
  | "attach" | "close" | "edit" | "file" | "message" | "moon" | "plus"
  | "search" | "send" | "smile" | "sparkles" | "sun" | "trash" | "users" | "bell" | "clock"
  | "pin" | "bellOff" | "lock" | "user" | "star" | "forward" | "check" | "checkDouble" | "image"
  | "home" | "logout" | "info";

interface Props extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export default function Icon({ name, size = 18, className = "", ...props }: Props) {
  const paths: Record<IconName, JSX.Element> = {
    attach: <path d="m19.5 12.6-7.8 7.8a5.25 5.25 0 0 1-7.43-7.43l8.14-8.14a3.5 3.5 0 1 1 4.95 4.95l-8.14 8.14a1.75 1.75 0 0 1-2.48-2.47l7.79-7.79" />,
    close: <path d="M18 6 6 18M6 6l12 12" />,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    moon: <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    smile: <><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>,
    sparkles: <><path d="m12 3-1.1 3.4A6.5 6.5 0 0 1 6.4 11L3 12l3.4 1.1a6.5 6.5 0 0 1 4.5 4.5L12 21l1.1-3.4a6.5 6.5 0 0 1 4.5-4.5L21 12l-3.4-1.1a6.5 6.5 0 0 1-4.5-4.5Z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    pin: <><path d="M12 17v5" /><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3Z" /></>,
    bellOff: <><path d="M8.7 3.7A6 6 0 0 1 18 8c0 3.5.9 5.8 1.7 7.2M6.3 6.3C6.1 6.8 6 7.4 6 8c0 7-3 9-3 9h13" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M2 2l20 20" /></>,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
    star: <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z" />,
    forward: <><path d="m15 6 6 6-6 6" /><path d="M3 12h18" /></>,
    check: <path d="M20 6 9 17l-5-5" />,
    checkDouble: <><path d="m2 12 4 4L15 7" /><path d="m9 16 1 1L21 7" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="1.5" /><path d="m21 15-5-5-9 9" /></>,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 8h.01" /></>,
  };

  return (
    <svg aria-hidden="true" className={`ui-icon ${className}`.trim()} fill="none" height={size} viewBox="0 0 24 24" width={size} {...props}>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[name]}</g>
    </svg>
  );
}
