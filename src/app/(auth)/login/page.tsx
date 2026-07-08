"use client";

import { useState } from "react";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const { navigateAuth } = useAuthTransition();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function continueWithGoogle() {
    setGoogleLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <>
      <h1 className="auth-title">Log in to PlayNext</h1>

      <div className="auth-actions">
        <button
          type="button"
          onClick={continueWithGoogle}
          disabled={googleLoading}
          className="auth-button auth-button-primary"
        >
          {googleLoading ? "Opening Google..." : "Continue with Google"}
        </button>

        <button
          type="button"
          onClick={() => navigateAuth("/login/email")}
          disabled={googleLoading}
          className="auth-button auth-button-secondary"
        >
          Continue with email
        </button>

        {errorMessage && (
          <p className="auth-error auth-login-error">{errorMessage}</p>
        )}
      </div>

      <p className="auth-footer">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => navigateAuth("/signup")}
          className="auth-link"
        >
          Sign up
        </button>
      </p>
    </>
  );
}