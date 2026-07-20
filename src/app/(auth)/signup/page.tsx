"use client";

import { useState } from "react";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
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
      setErrorMessage("Google sign-up could not be started. Please try again or continue with email.");
      setGoogleLoading(false);
      return;
    }
  }

  return (
    <>
      <h1 className="auth-title">Create your PlayNext account</h1>

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
          onClick={() => navigateAuth("/signup/email")}
          className="auth-button auth-button-secondary"
        >
          Continue with email
        </button>
      </div>

      {errorMessage && <p className="auth-error auth-login-error" role="alert">{errorMessage}</p>}

      <p className="auth-footer">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => navigateAuth("/login")}
          className="auth-link"
        >
          Log in
        </button>
      </p>
    </>
  );
}
