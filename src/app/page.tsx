import LandingHero from "@/components/landing/LandingHero";
import LandingNavbar from "@/components/landing/LandingNavbar";
import "./landing.css";

export default function Home() {
  return (
    <div className="landing-page">
      <LandingNavbar />
      <LandingHero />
    </div>
  );
}