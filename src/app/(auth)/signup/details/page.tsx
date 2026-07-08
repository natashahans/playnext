"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";
import { supabase } from "@/lib/supabase";

export default function SignupDetailsPage() {
  const { navigateAuth } = useAuthTransition();
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
        emailRedirectTo: `${window.location.origin}/auth/finish`,
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

    navigateAuth("/signup/check-email");
  }

  return (
    <>

      <h1 className="auth-title">Create your account</h1>

      <form onSubmit={createAccount} className="auth-actions">
        <input type="email" value={emailFromUrl} disabled autoComplete="email" className="auth-input" />

        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          autoComplete="name"
          className="auth-input"
        />

        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create password"
          autoComplete="new-password"
          className="auth-input"
        />

        <button type="submit" disabled={loading} className="auth-button auth-button-primary">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="auth-footer">
        <button type="button" onClick={() => navigateAuth("/signup/email")} className="auth-link">
          Back
        </button>
      </p>
    </>
  );
}