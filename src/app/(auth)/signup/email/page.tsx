"use client";

import { useState } from "react";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";

export default function SignupEmailPage() {
  const { navigateAuth } = useAuthTransition();
  const [email, setEmail] = useState("");

  function continueWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const encodedEmail = encodeURIComponent(email.trim());
    navigateAuth(`/signup/details?email=${encodedEmail}`);
  }

  return (
    <>

      <h1 className="auth-title">What&apos;s your email address?</h1>

      <form onSubmit={continueWithEmail} className="auth-actions">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email address..."
          autoComplete="email"
          className="auth-input"
        />

        <button type="submit" className="auth-button auth-button-secondary">
          Continue with email
        </button>
      </form>

      <p className="auth-footer">
        <button type="button" onClick={() => navigateAuth("/signup")} className="auth-link">
          Back to signup
        </button>
      </p>
    </>
  );
}