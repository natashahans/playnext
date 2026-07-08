"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function resetPassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace("/login?reset=success");
  }

return (
  <>
    <h1 className="auth-title">Choose a new password</h1>

    <form onSubmit={resetPassword} className="auth-actions">
      <div className="auth-password">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="New password"
          value={password}
          minLength={6}
          required
          onChange={(e) => setPassword(e.target.value)}
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

      <div className="auth-password">
        <input
          type={showConfirmPassword ? "text" : "password"}
          placeholder="Confirm password"
          value={confirmPassword}
          minLength={6}
          required
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="auth-input"
        />

        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="auth-password-toggle"
          aria-label={
            showConfirmPassword ? "Hide password" : "Show password"
          }
        >
          {showConfirmPassword ? (
            <Eye size={16} />
          ) : (
            <EyeOff size={16} />
          )}
        </button>
      </div>

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
        {loading ? "Updating..." : "Reset password"}
      </button>
    </form>
  </>
);
}