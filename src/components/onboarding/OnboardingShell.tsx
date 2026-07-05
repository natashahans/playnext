import Link from "next/link";
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
}: OnboardingShellProps) {
  const progress = (step / totalSteps) * 100;

  return (
    <main className="onboarding-page">
      <div className="onboarding-shell">
        <header className="onboarding-brand">
          <Link href="/">PlayNext</Link>
        </header>

        <div className="onboarding-progress">
          <div
            className="onboarding-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="onboarding-content">
          <div className="onboarding-inner">
            <h1 className="onboarding-title">{title}</h1>

            {description && (
              <p className="onboarding-description">{description}</p>
            )}

            <div className="onboarding-options">{children}</div>

            <div className="onboarding-actions">
              {backHref && (
                <Link href={backHref} className="onboarding-button-secondary">
                  Back
                </Link>
              )}

              {onNext && (
                <button
                  onClick={onNext}
                  disabled={nextDisabled || loading}
                  className="onboarding-button-primary"
                >
                  {loading ? "Saving..." : nextLabel}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}