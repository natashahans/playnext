"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";
import { supabase } from "@/lib/supabase";

export default function CheckEmailPage() {
  const { navigateAuth } = useAuthTransition();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function resendEmail() {
    if (!email) {
      alert("Email address missing. Please sign up again.");
      return;
    }

    setResending(true);
    setResent(false);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/finish`,
      },
    });

    if (error) {
      alert(error.message);
      setResending(false);
      return;
    }

    setResent(true);
    setResending(false);
  }

  return (
    <>
      <h1 className="auth-title">Check your email</h1>

      <p className="auth-helper">
        We sent a confirmation link{email ? ` to ${email}` : ""}. Open it to
        finish creating your PlayNext account.
      </p>

      <div className="auth-actions">
        <button
          type="button"
          onClick={resendEmail}
          disabled={resending}
          className="auth-button auth-button-secondary"
        >
          {resending ? "Sending..." : "Resend email"}
        </button>

        <button
          type="button"
          onClick={() => navigateAuth("/login")}
          className="auth-button auth-button-secondary"
        >
          Go to login
        </button>
      </div>

      {resent && (
        <p className="auth-helper">
          Confirmation email sent again. Check your inbox and spam folder.
        </p>
      )}
    </>
  );
}