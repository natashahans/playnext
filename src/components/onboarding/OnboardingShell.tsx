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
        <header className="flex items-center justify-center">
          <Link href="/" className="text-sm font-medium text-white/70">
            PlayNext
          </Link>
        </header>

        <div className="mx-auto mt-8 h-[2px] w-full max-w-[420px] overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="flex flex-1 items-center justify-center py-16">
          <div className="w-full max-w-3xl text-center">
            <h1 className="mx-auto max-w-3xl text-[52px] font-semibold leading-[0.92] tracking-[-0.075em] md:text-[72px]">
              {title}
            </h1>

            {description && (
              <p className="mx-auto mt-6 max-w-xl text-[15px] leading-7 text-white/48">
                {description}
              </p>
            )}

            <div className="mt-12">{children}</div>

            <div className="mt-12 flex items-center justify-center gap-3">
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