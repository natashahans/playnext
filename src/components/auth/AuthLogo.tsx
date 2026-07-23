type AuthLogoProps = {
  className?: string;
};

export default function AuthLogo({
  className = "",
}: AuthLogoProps) {
  return (
    <div className={`auth-logo ${className}`.trim()}>
      <svg
        width="24"
        height="16"
        viewBox="0 0 34 22"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="9"
          cy="11"
          r="6.2"
          stroke="currentColor"
          strokeWidth="2.8"
        />

        <path
          d="M19 5.6L27 11L19 16.4"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M26 5.6L32 11L26 16.4"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.34"
        />
      </svg>
    </div>
  );
}