"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
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

export default function LoginPage() {
  async function continueWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) alert(error.message);
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <AuthLogo />

          <h1 className="auth-title">Log in to PlayNext</h1>

          <div className="auth-actions">
            <button
              onClick={continueWithGoogle}
              className="auth-button auth-button-primary"
            >
              Continue with Google
            </button>

            <Link href="/login/email" className="auth-button auth-button-secondary">
              Continue with email
            </Link>
          </div>

          <p className="auth-footer">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="auth-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}