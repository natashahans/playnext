"use client";

import Image from "next/image";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import AddRawgGameButton from "@/components/games/AddRawgGameButton";
import type { RawgGame } from "@/lib/rawg";

type DiscoveryGameCardProps = {
  game: RawgGame;
  alreadyAdded?: boolean;
  existingUserGameId?: string;
  onCollectionChange: (gameId: number, userGameId: string | null) => void;
  priority?: boolean;
};

export default function DiscoveryGameCard({
  game,
  alreadyAdded = false,
  existingUserGameId,
  onCollectionChange,
  priority = false,
}: DiscoveryGameCardProps) {
  const genreNames = game.genres
    ?.map((genre) => genre.name.trim())
    .filter((genre) => genre.length > 0)
    .slice(0, 2) ?? [];

  return (
    <article className="discover-card">
      <div className="discover-card-artwork">
        <Link
          href={`/dashboard/search/${game.slug}`}
          className="discover-card-artwork-link"
          aria-label={`View details for ${game.name}`}
        >
          {game.background_image ? (
            <Image
              src={game.background_image}
              alt={`${game.name} promotional artwork`}
              fill
              sizes="(max-width: 620px) 74vw, (max-width: 1100px) 36vw, 260px"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="discover-card-placeholder">
              <Gamepad2 size={26} aria-hidden="true" />
            </div>
          )}

          <div className="discover-card-overlay" />
        </Link>

        <div className="discover-card-action">
          <AddRawgGameButton
            game={game}
            alreadyAdded={Boolean(existingUserGameId) || alreadyAdded}
            existingUserGameId={existingUserGameId}
            onAdded={(userGameId) => onCollectionChange(game.id, userGameId ?? null)}
            onRemoved={() => onCollectionChange(game.id, null)}
            iconOnly
          />
        </div>
      </div>

      <Link
        href={`/dashboard/search/${game.slug}`}
        className="discover-card-copy-link"
        aria-label={`View details for ${game.name}`}
      >
        <div className="discover-card-copy">
          <h3>{game.name}</h3>
          <p className="discover-card-meta">
            {genreNames.length > 0 ? (
              genreNames.map((genre) => (
                <span key={genre} className="discover-card-tag">{genre}</span>
              ))
            ) : (
              <span className="discover-card-tag discover-card-tag-fallback">Game</span>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
