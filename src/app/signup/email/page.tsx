"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function SignupEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  function continueWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const encodedEmail = encodeURIComponent(email.trim());
    router.push(`/signup/details?email=${encodedEmail}`);
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <PlayNextLogo />

          <h1 className="auth-title">What&apos;s your email address?</h1>

          <form onSubmit={continueWithEmail} className="auth-actions">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email address..."
              className="auth-input"
            />

            <button type="submit" className="auth-button auth-button-secondary">
              Continue with email
            </button>
          </form>

          <p className="auth-footer">
            <Link href="/signup" className="auth-link">
              Back to signup
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}