import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/collection", label: "My Collection" },
  { href: "/dashboard/search", label: "Add Games" },
  { href: "/dashboard/recommend", label: "PlayNext" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="border-r border-slate-800 bg-slate-900/50 p-6">
          <Link href="/" className="text-xl font-bold">
            PlayNext
          </Link>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="p-8">
          {children}
        </section>
      </div>
    </main>
  );
}