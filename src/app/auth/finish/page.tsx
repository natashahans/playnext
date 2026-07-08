"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthFinishPage() {
  const router = useRouter();

  useEffect(() => {
    async function finishAuth() {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        router.replace("/dashboard");
        return;
      }

      router.replace("/onboarding/genres");
    }

    finishAuth();
  }, [router]);

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <p className="auth-title">Signing you in...</p>
        </div>
      </div>
    </main>
  );
}