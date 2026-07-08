"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";
import { supabase } from "@/lib/supabase";

export default function LoginEmailPage() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") ?? "";
  const { navigateAuth } = useAuthTransition();

  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function loginWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage("Incorrect email or password.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <>

      <h1 className="auth-title">Log in with email</h1>

      <form onSubmit={loginWithEmail} className="auth-actions">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          autoComplete="email"
          className="auth-input"
        />

        <div className="auth-password">
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create password"
            autoComplete="new-password"
            className="auth-input"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="auth-password-toggle"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>

        {errorMessage && (
          <p className="auth-error auth-login-error">
            {errorMessage}
          </p>
        )}

        <p className="auth-forgot">
          <button
            type="button"
            onClick={() =>
              navigateAuth(`/login/forgot-password?email=${encodeURIComponent(email.trim())}`)
            }
            className="auth-link"
          >
            Forgot password?
          </button>
        </p>

        <button type="submit" className="auth-button auth-button-primary">
          Log in
        </button>
      </form>

      <p className="auth-footer">
        <button
          type="button"
          onClick={() => navigateAuth("/login")}
          className="auth-link"
        >
          Back to login
        </button>
      </p>
    </>
  );
}