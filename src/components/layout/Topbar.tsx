"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import AuthLogo from "@/components/auth/AuthLogo";
import { supabase } from "@/lib/supabase";

const pageTitles: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/collection": "My collection",
  "/dashboard/search": "Add games",
  "/dashboard/recommend": "Decide",
  "/dashboard/history": "History",
  "/dashboard/settings": "Settings",
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const title = pathname.startsWith("/dashboard/search/")
    ? "Game details"
    : pageTitles[pathname] ?? "PlayNext";

  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
  }

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar-context">
        <Link href="/dashboard" className="dashboard-mobile-brand" aria-label="PlayNext home">
          <AuthLogo />
        </Link>
        <div>
          <span>PlayNext</span>
          <h1 className="dashboard-page-title">{title}</h1>
        </div>
      </div>

      <div className="dashboard-topbar-actions">
        {pathname !== "/dashboard/settings" && (
          <Link
            href="/dashboard/settings"
            className="dashboard-settings-button"
            aria-label="Open settings"
          >
            <Settings size={17} aria-hidden="true" />
          </Link>
        )}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="dashboard-logout-button"
        >
          <LogOut size={15} aria-hidden="true" />
          <span className="dashboard-logout-label">
            {loggingOut ? "Logging out…" : "Log out"}
          </span>
        </button>
      </div>
    </header>
  );
}
