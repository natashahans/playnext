"use client";

import { useState } from "react";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";

export default function SignupEmailPage() {
  const { navigateAuth } = useAuthTransition();

  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function continueWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) return;

    setErrorMessage("");

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
                  onClick={() =>
                    navigateAuth(`/login/email?email=${encodeURIComponent(email.trim().toLowerCase())}`)
                  }
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
          className="auth-button auth-button-secondary"
        >
          Continue with email
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
