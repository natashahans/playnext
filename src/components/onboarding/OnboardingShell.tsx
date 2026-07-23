import Link from "next/link";
import AuthLogo from "@/components/auth/AuthLogo";
import type { ReactNode } from "react";

type OnboardingShellProps = {
  step: number;
  totalSteps: number;
  title: string;
  description?: string;
  children: ReactNode;
  backHref?: string;
  nextLabel?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  loading?: boolean;
  selectionStatus?: ReactNode;
  eyebrow?: string;
};

export default function OnboardingShell({
  step,
  totalSteps,
  title,
  description,
  children,
  backHref,
  nextLabel = "Continue",
  onNext,
  nextDisabled = false,
  loading = false,
  selectionStatus,
  eyebrow = "Set up PlayNext",
}: OnboardingShellProps) {
  const progress = (step / totalSteps) * 100;
  const steps = ["Taste", "Platforms", "Library"];

  return (
    <main className="onboarding-page">
      <header className="onboarding-topbar">
        <Link href="/" className="onboarding-logo">
          <AuthLogo />
          <span className="onboarding-logo-text">PlayNext</span>
        </Link>
      </header>

      <div className="onboarding-shell">
        <div className={`onboarding-card ${step === 3 ? "onboarding-card-collection" : ""}`}>
          <aside className="onboarding-rail" aria-label="Setup progress">
            <div>
              <span className="onboarding-rail-kicker">Personal setup</span>
              <h2>Make every answer feel like yours.</h2>
              <p>Three quick steps give PlayNext a useful starting point. You can change everything later.</p>
            </div>
            <ol>
              {steps.slice(0, totalSteps).map((label, index) => {
                const number = index + 1;
                const state = number < step ? "is-complete" : number === step ? "is-current" : "";
                return <li key={label} className={state}><span>{number < step ? "✓" : number}</span><div><strong>{label}</strong><small>{number === 1 ? "What you enjoy" : number === 2 ? "Where you play" : "Games you know"}</small></div></li>;
              })}
            </ol>
          </aside>

          <div className="onboarding-card-inner">
            <div className="onboarding-card-header">
              <div className="onboarding-hero-meta">
                <span className="onboarding-eyebrow">{eyebrow}</span>
                <span className="onboarding-step-pill">Step {step} of {totalSteps}</span>
              </div>

              <h1 className="onboarding-title">{title}</h1>

              {description && (
                <p className="onboarding-description">{description}</p>
              )}

              <div className="onboarding-progress" aria-label={`Step ${step} of ${totalSteps}`}>
                <div className="onboarding-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="onboarding-options">{children}</div>
          </div>

          <div className="onboarding-footer">
            <div className="onboarding-footer-status">{selectionStatus}</div>

            <div className="onboarding-actions">
              {backHref && (
                <Link href={backHref} className="onboarding-button-secondary">
                  Back
                </Link>
              )}

              {onNext && (
                <button
                  type="button"
                  onClick={onNext}
                  disabled={nextDisabled || loading}
                  className="onboarding-button-primary"
                >
                  {loading ? "One moment…" : nextLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
