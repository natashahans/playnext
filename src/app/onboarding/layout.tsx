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
    let active = true;

    async function checkUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          email: data.user.email ?? null,
        },
        { onConflict: "id" }
      );

      if (!active) return;

      if (profileError) {
        console.error("Unable to bootstrap profile before onboarding:", profileError.message);
        router.replace("/login");
        return;
      }

      setChecking(false);
    }

    checkUser();

    return () => {
      active = false;
    };
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
          <p className="text-[13px] text-[#777982]">
            Loading PlayNext...
          </p>
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