"use client";

import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";
import AuthLogo from "@/components/auth/AuthLogo";

export default function CheckEmailPage() {
  const { navigateAuth } = useAuthTransition();

  return (
    <>
      <AuthLogo />

      <h1 className="auth-title">Check your email</h1>

      <p className="auth-helper">
        We sent you a confirmation link. Open it to finish creating your PlayNext account.
      </p>

      <div className="auth-actions">
        <button type="button" onClick={() => navigateAuth("/login")} className="auth-button auth-button-secondary">
          Go to login
        </button>
      </div>
    </>
  );
}