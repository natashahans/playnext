"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";

function PlayNextLogo() {
  return (
    <div className="mx-auto mb-[28px] flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#2f3033]">
      <svg
        width="24"
        height="16"
        viewBox="0 0 34 22"
        fill="none"
        className="text-white"
      >
        <circle cx="9" cy="11" r="6.2" stroke="currentColor" strokeWidth="2.8" />
        <path
          d="M19 5.6L27 11L19 16.4"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M26 5.6L32 11L26 16.4"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.34"
        />
      </svg>
    </div>
  );
}

export default function SignupPage() {
  async function continueWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-[#242528]">
      <div className="flex min-h-screen items-start justify-center px-6 pt-[29vh]">
        <div className="w-full max-w-[340px] text-center">
          <PlayNextLogo />

          <h1 className="text-[18px] font-medium tracking-[-0.02em] text-[#242528]">
            Create your PlayNext account
          </h1>

          <div className="mt-[30px] flex flex-col items-center gap-6">
            <button
              onClick={continueWithGoogle}
              className="h-[44px] w-[288px] rounded-full bg-[#5E6AD2] text-[13px] font-medium text-white transition hover:bg-[#5662CB]"
            >
              Continue with Google
            </button>

            <Link
              href="/signup/email"
              className="flex h-[44px] w-[288px] items-center justify-center rounded-full border border-[#e3e3e6] bg-white text-[13px] font-medium text-[#242528] transition hover:bg-[#f4f4f5]"
            >
              Continue with email
            </Link>
          </div>

          <p className="mt-[38px] text-[13px] text-[#6b6c72]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#242528] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}