"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthFinishPage() {
  const router = useRouter();

  useEffect(() => {
    async function finishAuth() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userData.user.id)
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
    <>
      <p className="auth-title">Signing you in...</p>
    </>
  );
}
