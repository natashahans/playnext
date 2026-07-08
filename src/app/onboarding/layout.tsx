"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    }

    checkUser();
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (checking) {
    return (
      <main className="onboarding-page">
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-[13px] text-white/45">Loading PlayNext...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="onboarding-logout"
      >
        {loggingOut ? "Logging out..." : "Log out"}
      </button>

      {children}
    </>
  );
}