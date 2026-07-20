"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock3,
  Compass,
  Home,
  Library,
  Search,
  Settings,
} from "lucide-react";
import AuthLogo from "@/components/auth/AuthLogo";

const navItems = [
  { href: "/dashboard", label: "Home", shortLabel: "Home", icon: Home, mobile: true },
  {
    href: "/dashboard/collection",
    label: "My collection",
    shortLabel: "Library",
    icon: Library,
    mobile: true,
  },
  {
    href: "/dashboard/search",
    label: "Add games",
    shortLabel: "Add",
    icon: Search,
    mobile: true,
  },
  {
    href: "/dashboard/recommend",
    label: "Decide",
    shortLabel: "Decide",
    icon: Compass,
    mobile: true,
  },
  {
    href: "/dashboard/history",
    label: "History",
    shortLabel: "History",
    icon: Clock3,
    mobile: true,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    shortLabel: "Settings",
    icon: Settings,
    mobile: false,
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="dashboard-sidebar">
        <Link href="/dashboard" className="dashboard-brand">
          <AuthLogo />
          <span className="dashboard-brand-name">PlayNext</span>
        </Link>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`dashboard-nav-item ${
                  active ? "dashboard-nav-item-active" : ""
                }`}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </aside>

      <nav className="dashboard-mobile-nav" aria-label="Mobile navigation">
        {navItems.filter((item) => item.mobile).map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`dashboard-mobile-nav-item ${
                active ? "dashboard-mobile-nav-item-active" : ""
              }`}
            >
              <Icon aria-hidden="true" />
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
