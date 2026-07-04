import { supabase } from "@/lib/supabase";
import type { Game } from "@/types/game";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import AddGameButton from "@/components/games/AddGameButton";

export default async function SearchPage() {
  const { data: games, error } = await supabase
    .from("games")
    .select("*")
    .order("title");

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold">Search Games</h1>
        <p className="mt-4 text-red-400">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Add Games</p>
        <h1 className="mt-2 text-3xl font-bold">Browse games</h1>
        <p className="mt-3 text-slate-400">
          These are sample games from Supabase. Later this page will search the RAWG API.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(games as Game[]).map((game) => (
          <Card key={game.id} className="overflow-hidden p-0">
            {game.background_image && (
              <img
                src={game.background_image}
                alt={game.title}
                className="h-48 w-full object-cover"
              />
            )}

            <div className="p-5">
              <h2 className="text-xl font-semibold">{game.title}</h2>

              <div className="mt-3 flex flex-wrap gap-2">
                {game.genres?.slice(0, 3).map((genre) => (
                  <Badge key={genre}>{genre}</Badge>
                ))}
              </div>

              <p className="mt-4 text-sm text-slate-400">
                Rating: {game.rating ?? "N/A"}
              </p>

              <AddGameButton gameId={game.id} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}