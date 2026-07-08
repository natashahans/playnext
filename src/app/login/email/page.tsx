"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

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

export default function LoginEmailPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function loginWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <PlayNextLogo />

          <h1 className="auth-title">Log in with email</h1>

          <form onSubmit={loginWithEmail} className="auth-actions">
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              autoComplete="email"
              className="auth-input"
            />

            <input
              type="password"
              name="currentPassword"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="auth-input"
            />

            <button type="submit" className="auth-button auth-button-primary">
              Log in
            </button>
          </form>

          <p className="auth-footer">
            <Link href="/login" className="auth-link">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}