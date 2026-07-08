"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const { navigateAuth } = useAuthTransition();

  const [email, setEmail] = useState(
    searchParams.get("email") ?? ""
  );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function sendResetEmail(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo:
            `${window.location.origin}/auth/reset-password`,
        }
      );

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    navigateAuth(
      `/login/check-reset-email?email=${encodeURIComponent(email)}`
    );
  }

  return (
    <>
      <h1 className="auth-title">
        Reset your password
      </h1>

      <form
        onSubmit={sendResetEmail}
        className="auth-actions"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          placeholder="Email address"
          className="auth-input"
        />

        {errorMessage && (
          <p className="auth-error auth-login-error">
            {errorMessage}
          </p>
        )}

        <button
        type="submit"
        disabled={loading}
        className="auth-button auth-button-primary"
        >
        {loading ? "Sending email..." : "Send reset email"}
        </button>
      </form>

      <p className="auth-footer">
        <button
          type="button"
          onClick={() => navigateAuth("/login/email")}
          className="auth-link"
        >
          Back
        </button>
      </p>
    </>
  );
}