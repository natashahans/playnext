import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/collection", label: "My Collection" },
  { href: "/dashboard/search", label: "Add Games" },
  { href: "/dashboard/recommend", label: "PlayNext" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 border-r border-slate-800 bg-slate-950 px-5 py-6 md:block">
      <Link href="/" className="text-xl font-bold tracking-tight text-white">
        PlayNext
      </Link>

      <p className="mt-2 text-xs text-slate-500">
        Decision-support system
      </p>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}