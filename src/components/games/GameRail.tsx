"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DiscoveryGameCard from "@/components/games/DiscoveryGameCard";
import type { DiscoverySection } from "@/lib/rawg";

type GameRailProps = {
  section: DiscoverySection;
  existingRawgIds: Set<number>;
  onAdded: (gameId: number) => void;
};

export default function GameRail({
  section,
  existingRawgIds,
  onAdded,
}: GameRailProps) {
  const railRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    railRef.current?.scrollBy({
      left: direction * Math.min(880, railRef.current.clientWidth * 0.8),
      behavior: "smooth",
    });
  }

  if (section.games.length === 0) return null;

  return (
    <section id={section.id} className="discover-rail-section">
      <div className="discover-rail-header">
        <div>
          <h2>{section.title}</h2>
          <p>{section.subtitle}</p>
        </div>

        <div className="discover-rail-controls" aria-label={`${section.title} controls`}>
          <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left">
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Scroll right">
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div ref={railRef} className="discover-rail">
        {section.games.map((game, index) => (
          <DiscoveryGameCard
            key={game.id}
            game={game}
            alreadyAdded={existingRawgIds.has(game.id)}
            onAdded={onAdded}
            priority={section.id === "trending" && index < 3}
          />
        ))}
      </div>
    </section>
  );
}
