export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm text-slate-400">
          PlayNext — Final Year Project
        </p>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          AI-Powered Game Backlog Decision Support System
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          PlayNext helps users decide what to play right now based on their
          mood, available time, energy level, preferences, and saved game
          collection.
        </p>

        <div className="mt-8 flex gap-4">
          <a
            href="/login"
            className="rounded-lg bg-white px-5 py-3 font-medium text-slate-950"
          >
            Log in
          </a>

          <a
            href="/signup"
            className="rounded-lg border border-slate-700 px-5 py-3 font-medium text-white"
          >
            Create account
          </a>
        </div>
      </section>
    </main>
  );
}