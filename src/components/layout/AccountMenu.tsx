"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Account = { name: string; email: string };

export default function AccountMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [account, setAccount] = useState<Account>({ name: "Account", email: "" });
  const [loggingOut, setLoggingOut] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const metadata = data.user.user_metadata ?? {};
      const name = metadata.full_name ?? metadata.name ?? data.user.email?.split("@")[0] ?? "Account";
      setAccount({ name: String(name), email: data.user.email ?? "" });
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!open) return;

    function closeMenu() {
      setOpen(false);
      menuRef.current?.removeAttribute("open");
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closeMenu();
      const summary = menuRef.current?.querySelector("summary") as HTMLElement | null;
      summary?.focus();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLoggingOut(false);
      return;
    }
    router.replace("/login");
  }

  const initial = account.name.trim().charAt(0).toUpperCase() || "P";

  function closeMenu() {
    setOpen(false);
    menuRef.current?.removeAttribute("open");
  }

  return (
    <details
      className={`dashboard-account ${compact ? "dashboard-account-compact" : ""}`}
      ref={menuRef}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary aria-label="Open your account menu">
        <span className="dashboard-account-avatar">
          <span>{initial}</span>
        </span>
        {!compact && (
          <span className="dashboard-account-copy">
            <strong>{account.name.split(" ")[0]}</strong>
            <small>{account.email}</small>
          </span>
        )}
      </summary>

      <div className="dashboard-account-menu">
        <Link href="/dashboard/settings" onClick={closeMenu}>
          <Settings aria-hidden="true" /> Settings
        </Link>
        <button type="button" onClick={handleLogout} disabled={loggingOut}>
          <LogOut aria-hidden="true" /> {loggingOut ? "Logging out…" : "Log out"}
        </button>
      </div>
    </details>
  );
}
