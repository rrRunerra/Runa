export const EventIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <path
      d="M12 7V3M12 21V17M17 12H21M3 12H7M15.5 8.5L18.5 5.5M5.5 18.5L8.5 15.5M15.5 15.5L18.5 18.5M5.5 5.5L8.5 8.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0"
      stroke="currentColor"
      strokeWidth="0.5"
      strokeDasharray="4 2"
    />
  </svg>
);
