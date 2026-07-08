"use client";

import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";
import AuthLogo from "@/components/auth/AuthLogo";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const { navigateAuth } = useAuthTransition();

  async function continueWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) alert(error.message);
  }

  return (
    <>

      <h1 className="auth-title">Create your PlayNext account</h1>

      <div className="auth-actions">
        <button type="button" onClick={continueWithGoogle} className="auth-button auth-button-primary">
          Continue with Google
        </button>

        <button type="button" onClick={() => navigateAuth("/signup/email")} className="auth-button auth-button-secondary">
          Continue with email
        </button>
      </div>

      <p className="auth-footer">
        Already have an account?{" "}
        <button type="button" onClick={() => navigateAuth("/login")} className="auth-link">
          Log in
        </button>
      </p>
    </>
  );
}