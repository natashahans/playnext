"use client";

import Image from "next/image";
import Link from "next/link";
import { Gamepad2, Star } from "lucide-react";
import AddRawgGameButton from "@/components/games/AddRawgGameButton";
import type { RawgGame } from "@/lib/rawg";

type DiscoveryGameCardProps = {
  game: RawgGame;
  alreadyAdded: boolean;
  onAdded: (gameId: number) => void;
  priority?: boolean;
};

export default function DiscoveryGameCard({
  game,
  alreadyAdded,
  onAdded,
  priority = false,
}: DiscoveryGameCardProps) {
  const platformNames =
    game.platforms?.slice(0, 2).map((item) => item.platform.name) ?? [];

  return (
    <article className="discover-card">
      <Link
        href={`/dashboard/search/${game.slug}`}
        className="discover-card-link"
        aria-label={`View details for ${game.name}`}
      >
        <div className="discover-card-artwork">
          {game.background_image ? (
            <Image
              src={game.background_image}
              alt={`${game.name} cover artwork`}
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

          {game.rating !== null && game.rating > 0 && (
            <span className="discover-card-rating">
              <Star size={11} fill="currentColor" aria-hidden="true" />
              {game.rating.toFixed(1)}
            </span>
          )}

          <span className="discover-card-view">View game</span>
        </div>

        <div className="discover-card-copy">
          <h3>{game.name}</h3>
          <p>
            {platformNames.length > 0
              ? platformNames.join(" · ")
              : game.genres?.[0]?.name ?? "Game"}
          </p>
        </div>
      </Link>

      <AddRawgGameButton
        game={game}
        alreadyAdded={alreadyAdded}
        onAdded={() => onAdded(game.id)}
      />
    </article>
  );
}
