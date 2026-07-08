"use client";

import { useState } from "react";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";

export default function SignupEmailPage() {
  const { navigateAuth } = useAuthTransition();

  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function continueWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) return;

    setChecking(true);
    setErrorMessage("");

    const response = await fetch("/api/auth/check-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: trimmedEmail }),
    });

    const result = await response.json();

    setChecking(false);

    if (!response.ok) {
      setErrorMessage("Something went wrong. Please try again.");
      return;
    }

    if (result.exists) {
      setErrorMessage("An account already exists with this email.");
      return;
    }

    const encodedEmail = encodeURIComponent(trimmedEmail);
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
          onChange={(event) => {
            setEmail(event.target.value);
            setErrorMessage("");
          }}
          placeholder="Enter your email address..."
          autoComplete="email"
          className="auth-input"
        />

        <div className="auth-message">
          {errorMessage && (
            <>
              <p className="auth-error">{errorMessage}</p>

              {errorMessage.includes("already exists") && (
                <button
                  type="button"
                  onClick={() => navigateAuth("/login")}
                  className="auth-error-link"
                >
                  Log in instead.
                </button>
              )}
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={checking}
          className="auth-button auth-button-secondary"
        >
          {checking ? "Checking..." : "Continue with email"}
        </button>
      </form>

      <p className="auth-footer">
        <button
          type="button"
          onClick={() => navigateAuth("/signup")}
          className="auth-link"
        >
          Back to signup
        </button>
      </p>
    </>
  );
}