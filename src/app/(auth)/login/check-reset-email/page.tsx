"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";

export default function CheckResetEmailPage() {
  const searchParams = useSearchParams();
  const { navigateAuth } = useAuthTransition();

  const email = searchParams.get("email") ?? "";

  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function resendEmail() {
    if (!email) return;

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/reset-password`,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setResent(true);
    setLoading(false);
  }

  return (
    <>
      <h1 className="auth-title">Check your email</h1>

      <p className="auth-helper">
        We've sent a password reset link to <strong>{email}</strong>.
      </p>

      {errorMessage && (
        <p className="auth-error auth-login-error">
          {errorMessage}
        </p>
      )}

      {resent && (
        <p className="auth-helper">
          Password reset email sent again.
        </p>
      )}

      <div className="auth-actions">
        <button
        type="button"
        onClick={resendEmail}
        disabled={loading}
        className="auth-button auth-button-secondary"
        >
        {loading ? "Sending..." : "Resend email"}
        </button>

        <button
          type="button"
          onClick={() => navigateAuth("/login")}
          className="auth-button auth-button-secondary"
        >
          Back to login
        </button>
      </div>
    </>
  );
}