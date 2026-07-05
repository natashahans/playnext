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
    <main className="min-h-screen bg-app text-app">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-white/75">
            PlayNext
          </Link>

          <p className="text-sm text-muted">
            Step {step} of {totalSteps}
          </p>
        </header>

        <div className="mt-8 h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-[var(--app-accent)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="flex flex-1 items-center justify-center py-16">
          <div className="w-full max-w-2xl text-center">
            <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.07em] md:text-6xl">
              {title}
            </h1>

            {description && (
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted">
                {description}
              </p>
            )}

            <div className="mt-10">{children}</div>

            <div className="mt-10 flex items-center justify-center gap-3">
              {backHref && (
                <Link href={backHref} className="btn-secondary">
                  Back
                </Link>
              )}

              {onNext && (
                <button
                  onClick={onNext}
                  disabled={nextDisabled || loading}
                  className="btn-primary min-w-36"
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