"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";

export default function Topbar() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
      <div>
        <p className="text-sm font-medium text-white">Home</p>
        <p className="text-xs text-slate-500">
          Your starting point for deciding what to play.
        </p>
      </div>

      <Button onClick={handleLogout} variant="secondary">
        Log out
      </Button>
    </header>
  );
}