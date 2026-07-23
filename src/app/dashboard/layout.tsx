"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const { data: userData } = await supabase.auth.getUser();

      if (!active) return;

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (!active) return;

      if (!profile?.onboarding_completed) {
        router.replace("/onboarding/genres");
        return;
      }

      setCheckingAccess(false);
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  if (checkingAccess) {
    return (
      <main className="dashboard-loading">
        <div className="dashboard-loading-inner" role="status">
          <span className="dashboard-loading-dot" aria-hidden="true" />
          <span>Preparing your PlayNext workspace…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <a className="dashboard-skip-link" href="#dashboard-main-content">
        Skip to main content
      </a>
      <div className="dashboard-frame">
        <Sidebar />

        <div className="dashboard-workspace">
          <Topbar />
          <section id="dashboard-main-content" className="dashboard-content" tabIndex={-1}>
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
