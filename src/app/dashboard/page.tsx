import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const placeholderGames = [
  { title: "Stardew Valley", mood: "Relaxing", color: "from-amber-500/30 to-rose-900/40" },
  { title: "Hades", mood: "Action", color: "from-red-500/30 to-orange-900/40" },
  { title: "Hollow Knight", mood: "Atmospheric", color: "from-sky-400/30 to-slate-900/60" },
  { title: "Celeste", mood: "Focused", color: "from-pink-400/30 to-indigo-900/50" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-8">
          <Badge>Decide now</Badge>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight">
            Ready to find your next game?
          </h1>

          <p className="mt-4 max-w-2xl text-slate-400">
            Tell PlayNext how you feel, how much time you have, and what kind of
            experience you want. The system will turn that context into one clear
            game decision.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-500">Example prompt</p>
            <p className="mt-2 text-lg text-slate-200">
              “I’m tired, I have 45 minutes, and I want something relaxing.”
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/dashboard/recommend">Start recommendation</Button>
            <Button href="/dashboard/search" variant="secondary">
              Add games first
            </Button>
          </div>
        </div>

        <Card>
          <p className="text-sm text-slate-400">Today’s pick</p>

          <div className="mt-5 flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950 text-center">
            <div>
              <p className="font-medium text-white">No pick yet</p>
              <p className="mt-2 text-sm text-slate-500">
                Start your first recommendation session.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <Button href="/dashboard/recommend" variant="secondary">
              Make first decision
            </Button>
          </div>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-400">Recently added</p>
            <h2 className="mt-1 text-2xl font-semibold">Your saved games</h2>
          </div>

          <Button href="/dashboard/collection" variant="ghost">
            View collection
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {placeholderGames.map((game) => (
            <Card key={game.title} className="overflow-hidden p-3">
              <div
                className={`flex aspect-[3/4] items-end rounded-2xl border border-slate-800 bg-gradient-to-br ${game.color} p-4`}
              >
                <div>
                  <p className="text-lg font-semibold text-white">{game.title}</p>
                  <p className="mt-1 text-sm text-slate-300">{game.mood}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <p className="text-sm text-slate-400">Collection</p>
          <h2 className="mt-3 text-3xl font-bold">0 games</h2>
          <p className="mt-2 text-sm text-slate-500">
            Add games so PlayNext has a real decision space.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>RPG</Badge>
            <Badge>Action</Badge>
            <Badge>Cozy</Badge>
            <Badge>Platformer</Badge>
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-400">How PlayNext helps</p>
          <h2 className="mt-2 text-xl font-semibold">
            Less browsing. More playing.
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-medium">1. Understand</p>
              <p className="mt-2 text-sm text-slate-500">
                Extract mood, time, energy and intent.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-medium">2. Score</p>
              <p className="mt-2 text-sm text-slate-500">
                Rank games from your saved collection.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-medium">3. Decide</p>
              <p className="mt-2 text-sm text-slate-500">
                Show one clear pick with a reason.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}