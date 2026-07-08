"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";
import { supabase } from "@/lib/supabase";

export default function LoginEmailPage() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") ?? "";
  const { navigateAuth } = useAuthTransition();

  const [email, setEmail] = useState(emailFromUrl);
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
    <>

      <h1 className="auth-title">Log in with email</h1>

      <form onSubmit={loginWithEmail} className="auth-actions">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          autoComplete="email"
          className="auth-input"
        />

        <input
          type="password"
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
        <button
          type="button"
          onClick={() => navigateAuth("/login")}
          className="auth-link"
        >
          Back to login
        </button>
      </p>
    </>
  );
}