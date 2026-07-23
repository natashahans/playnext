import Link from "next/link";
import LandingLogo from "./LandingLogo";

export default function LandingNavbar() {
  return (
    <header className="landing-navbar">
      <div className="landing-navbar-inner">
        <LandingLogo />

        <nav
          className="landing-nav-links"
          aria-label="Landing page navigation"
        >
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#recommendation-demo">Demo</a>
          <a href="#about">About</a>
        </nav>

        <div className="landing-nav-actions">
          <Link href="/login" className="landing-login-link">
            Log in
          </Link>

          <Link href="/signup" className="landing-nav-cta">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}