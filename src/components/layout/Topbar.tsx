"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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

  const title = pageTitles[pathname] ?? "PlayNext";

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
      <h1 className="dashboard-page-title">{title}</h1>

      <div className="dashboard-topbar-actions">
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
