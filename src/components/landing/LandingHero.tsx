"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import RecommendationPreview from "./RecommendationPreview";

export default function LandingHero() {
  const heroRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      if (!heroRef.current) {
        return;
      }

      const hero = heroRef.current;
      const rect = hero.getBoundingClientRect();

      const scrollableDistance = Math.max(
        hero.offsetHeight - window.innerHeight,
        1,
      );

      const progress = Math.min(
        Math.max(-rect.top / scrollableDistance, 0),
        1,
      );

      setScrollProgress(progress);
      frameRef.current = null;
    };

    const handleScroll = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current =
        window.requestAnimationFrame(updateScrollProgress);
    };

    updateScrollProgress();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const backgroundScale = 1 + scrollProgress * 0.03;
  const backgroundTranslate = scrollProgress * -16;
  const mockupTranslate = scrollProgress * -10;

  return (
    <main
      ref={heroRef}
      className="landing-hero"
    >
      <div
        className="landing-hero-background"
        aria-hidden="true"
        style={{
          transform: `translate3d(0, ${backgroundTranslate}px, 0) scale(${backgroundScale})`,
        }}
      />

      <div
        className="landing-hero-overlay"
        aria-hidden="true"
      />

      <section className="landing-hero-content">
        <div className="landing-hero-copy">
            <div className="landing-hero-glow" />
          <h1 className="landing-hero-title">
            What to play is now
            <span>a simple decision.</span>
          </h1>

          <p className="landing-hero-description">
            Tell PlayNext what you feel like playing. It considers your
            available time, mood and preferences to recommend one game from
            your own collection.
          </p>

          <Link
            href="/signup"
            className="landing-hero-primary-cta"
          >
            Get started free
            <ArrowRight
              size={16}
              aria-hidden="true"
            />
          </Link>

          <div
            className="landing-hero-pills"
            aria-label="Recommendation context"
          >
            <span className="landing-hero-pills-label">
              Decide with
            </span>

            <span className="landing-hero-pill landing-hero-pill-active">
              Your mood
            </span>

            <span
              className="landing-hero-pill-separator"
              aria-hidden="true"
            >
              ·
            </span>

            <span className="landing-hero-pill">
              Available time
            </span>

            <span
              className="landing-hero-pill-separator"
              aria-hidden="true"
            >
              ·
            </span>

            <span className="landing-hero-pill">
              Energy
            </span>

            <span
              className="landing-hero-pill-separator"
              aria-hidden="true"
            >
              ·
            </span>

            <span className="landing-hero-pill">
              Your collection
            </span>
          </div>
        </div>

        <div
          className="landing-hero-product"
          style={{
            transform: `translate3d(0, ${mockupTranslate}px, 0)`,
          }}
        >
          <RecommendationPreview />
        </div>
      </section>
    </main>
  );
}