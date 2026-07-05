import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-app text-app">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <p className="eyebrow">PlayNext</p>

        <h1 className="mt-5 text-5xl font-semibold tracking-tight md:text-7xl">
          Stop browsing.
          <br />
          Start playing.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
          PlayNext helps you decide what to play based on your mood, time,
          energy, preferences and game collection.
        </p>

        <div className="mt-8 flex gap-3">
          <Link href="/signup" className="btn-primary">
            Create account
          </Link>

          <Link href="/login" className="btn-secondary">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}