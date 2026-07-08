import Link from "next/link";
import AuthLogo from "@/components/auth/AuthLogo";

function PlayNextLogo() {
  return (
    <div className="auth-logo">
      <svg width="24" height="16" viewBox="0 0 34 22" fill="none">
        <circle cx="9" cy="11" r="6.2" stroke="currentColor" strokeWidth="2.8" />
        <path d="M19 5.6L27 11L19 16.4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 5.6L32 11L26 16.4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.34" />
      </svg>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <AuthLogo />

          <h1 className="auth-title">Check your email</h1>

          <p className="auth-helper">
            We sent you a confirmation link. Open it to finish creating your
            PlayNext account.
          </p>

          <div className="auth-actions">
            <Link href="/login" className="auth-button auth-button-secondary">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}