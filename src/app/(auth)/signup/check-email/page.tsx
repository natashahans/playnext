"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";
import { supabase } from "@/lib/supabase";

export default function CheckEmailPage() {
  const router = useRouter();
  const { navigateAuth } = useAuthTransition();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function redirectIfLoggedIn() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        router.replace("/dashboard");
        return;
      }

      router.replace("/onboarding/genres");
    }

    redirectIfLoggedIn();
  }, [router]);

  async function resendEmail() {
    if (!email) {
      setErrorMessage("Email address missing. Please sign up again.");
      return;
    }

    setResending(true);
    setResent(false);
    setErrorMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/finish`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
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

      {errorMessage && (
        <p className="auth-error auth-login-error">
          {errorMessage}
        </p>
      )}

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