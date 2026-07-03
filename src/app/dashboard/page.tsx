"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-slate-400">
            This will become the main PlayNext user dashboard.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-white px-4 py-2 font-medium text-slate-950"
        >
          Log out
        </button>
      </div>
    </main>
  );
}