"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuthTransition } from "@/components/auth/AuthTransitionProvider";
import { supabase } from "@/lib/supabase";

export default function SignupDetailsPage() {
  const { navigateAuth } = useAuthTransition();
  const searchParams = useSearchParams();

  const emailFromUrl = searchParams.get("email") ?? "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    setErrorMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: emailFromUrl,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/finish`,
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("rate limit")) {
        setErrorMessage("Too many emails sent. Please wait a while and try again.");
      } else {
        setErrorMessage(error.message);
      }

      setLoading(false);
      return;
    }

    if (data.user && data.user.identities?.length === 0) {
      setErrorMessage("An account already exists with this email.");
      setLoading(false);
      return;
    }

    const encodedEmail = encodeURIComponent(emailFromUrl);
    navigateAuth(`/signup/check-email?email=${encodedEmail}`);
  }

  return (
    <>
      <h1 className="auth-title">Create your account</h1>

      <form onSubmit={createAccount} className="auth-actions">
        <input
          type="email"
          value={emailFromUrl}
          disabled
          autoComplete="email"
          className="auth-input"
        />

        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          autoComplete="name"
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
          <p className="auth-error auth-login-error">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="auth-button auth-button-primary"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="auth-footer">
        <button
          type="button"
          onClick={() => navigateAuth("/signup/email")}
          className="auth-link"
        >
          Back
        </button>
      </p>
    </>
  );
}