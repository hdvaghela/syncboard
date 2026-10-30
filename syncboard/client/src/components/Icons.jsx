const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
export const PlusIcon = (p) => (<svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const CloseIcon = (p) => (<svg {...base} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>);
export const BackIcon = (p) => (<svg {...base} {...p}><path d="m15 18-6-6 6-6" /></svg>);
export const TrashIcon = (p) => (<svg {...base} {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>);
export const UsersIcon = (p) => (<svg {...base} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></svg>);
export const CalendarIcon = (p) => (<svg {...base} {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>);
export const Logo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#5B3DF5" />
    <rect x="6" y="7" width="6" height="14" rx="2" fill="#fff" />
    <rect x="13" y="7" width="6" height="18" rx="2" fill="#fff" opacity=".7" />
    <rect x="20" y="7" width="6" height="10" rx="2" fill="#fff" />
  </svg>
);
