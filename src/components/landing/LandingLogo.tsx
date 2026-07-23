import Link from "next/link";
import AuthLogo from "@/components/auth/AuthLogo";

export default function LandingLogo() {
  return (
    <Link href="/" className="landing-logo">
      <AuthLogo className="landing-logo-icon" />
      <span className="landing-logo-text">PlayNext</span>
    </Link>
  );
}