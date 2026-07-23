"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, Compass, Home, Library, Search } from "lucide-react";
import AuthLogo from "@/components/auth/AuthLogo";
import AccountMenu from "@/components/layout/AccountMenu";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/search", label: "Discover", icon: Search },
  { href: "/dashboard/recommend", label: "Decide", icon: Compass },
  { href: "/dashboard/collection", label: "Library", icon: Library },
  { href: "/dashboard/history", label: "History", icon: Clock3 },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="dashboard-sidebar">
        <Link href="/dashboard" className="dashboard-brand" aria-label="PlayNext home">
          <AuthLogo />
          <span className="dashboard-brand-name">PlayNext</span>
        </Link>

        <nav className="dashboard-nav" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`dashboard-nav-item ${active ? "dashboard-nav-item-active" : ""}`}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="dashboard-sidebar-account">
          <AccountMenu />
        </div>
      </aside>

      <nav className="dashboard-mobile-nav" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`dashboard-mobile-nav-item ${active ? "dashboard-mobile-nav-item-active" : ""}`}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
