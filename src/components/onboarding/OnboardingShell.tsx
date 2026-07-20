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
  eyebrow = "Your gaming taste",
}: OnboardingShellProps) {
  const completedSteps = step - 1;
  const progress = (completedSteps / totalSteps) * 100;

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
          <div className="onboarding-card-inner">
            <div className="onboarding-card-header">
              <div className="onboarding-hero-meta">
                <span className="onboarding-eyebrow">{eyebrow}</span>
                <span className="onboarding-step-pill">
                  Step {step} of {totalSteps}
                </span>
              </div>

              <h1 className="onboarding-title">{title}</h1>

              {description && (
                <p className="onboarding-description">{description}</p>
              )}

              <div className="onboarding-progress-summary">
                <div className="onboarding-progress-copy">
                  <span className="onboarding-progress-label">
                    Onboarding progress
                  </span>
                  <strong>{Math.round(progress)}%</strong>
                </div>
                <div className="onboarding-progress">
                  <div
                    className="onboarding-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
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
                  {loading ? "Saving..." : nextLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
