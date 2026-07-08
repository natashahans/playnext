"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
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

export default function SignupDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailFromUrl = searchParams.get("email") ?? "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: emailFromUrl,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    router.push("/signup/check-email");
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <AuthLogo />

          <h1 className="auth-title">Create your account</h1>

          <form onSubmit={createAccount} className="auth-actions">
            <input
            type="email"
            name="email"
            value={emailFromUrl}
            disabled
            autoComplete="email"
            className="auth-input"
            />

            <input
            type="text"
            name="fullName"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
            className="auth-input"
            />

            <input
            type="password"
            name="newPassword"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create password"
            autoComplete="new-password"
            className="auth-input"
            />

            <button
              type="submit"
              disabled={loading}
              className="auth-button auth-button-primary"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-footer">
            <Link href="/signup/email" className="auth-link">
              Back
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}