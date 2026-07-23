import Link from "next/link";
import AuthLogo from "@/components/auth/AuthLogo";
import AccountMenu from "@/components/layout/AccountMenu";

export default function Topbar() {
  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar-context">
        <Link
          href="/dashboard"
          className="dashboard-mobile-brand"
          aria-label="PlayNext home"
        >
          <AuthLogo />
          <span className="dashboard-mobile-brand-name">PlayNext</span>
        </Link>
      </div>

      <AccountMenu compact />
    </header>
  );
}
