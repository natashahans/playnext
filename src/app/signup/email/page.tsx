"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

function PlayNextLogo() {
  return (
    <div className="mx-auto mb-[28px] flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#2f3033]">
      <svg width="24" height="16" viewBox="0 0 34 22" fill="none" className="text-white">
        <circle cx="9" cy="11" r="6.2" stroke="currentColor" strokeWidth="2.8" />
        <path d="M19 5.6L27 11L19 16.4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 5.6L32 11L26 16.4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.34" />
      </svg>
    </div>
  );
}

export default function SignupEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  function continueWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const encodedEmail = encodeURIComponent(email.trim());
    router.push(`/signup/details?email=${encodedEmail}`);
  }

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-[#242528]">
      <div className="flex min-h-screen items-start justify-center px-6 pt-[29vh]">
        <div className="w-full max-w-[340px] text-center">
          <PlayNextLogo />

          <h1 className="text-[18px] font-medium tracking-[-0.02em] text-[#242528]">
            What&apos;s your email address?
          </h1>

          <form onSubmit={continueWithEmail} className="mt-[30px] flex flex-col items-center gap-6">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email address..."
              className="h-[44px] w-[288px] rounded-[12px] border border-[#5E6AD2] bg-white px-4 text-[13px] text-[#242528] outline-none placeholder:text-[#9a9ba1]"
            />

            <button
              type="submit"
              className="h-[44px] w-[288px] rounded-full border border-[#e3e3e6] bg-white text-[13px] font-medium text-[#242528] transition hover:bg-[#f4f4f5]"
            >
              Continue with email
            </button>
          </form>

          <p className="mt-[28px] text-[13px]">
            <Link href="/signup" className="text-[#55565c] hover:text-[#242528] hover:underline">
              Back to signup
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}