import { resolveLeaderboardCardArtUrl } from "@/lib/valorant-player-card";

type Props = {
  riotPlayerCardWide?: string | null;
  riotPlayerCard?: string | null;
  /** Wider art + stronger opacity for #1 / featured rows */
  featured?: boolean;
  shimmer?: boolean;
};

/**
 * Player card art anchored on the right, filling back to ~end of the player name.
 * Single layout path for every user (wide + portrait cards render identically).
 */
export default function LeaderboardPlayerCardBackdrop({
  riotPlayerCardWide,
  riotPlayerCard,
  featured = false,
  shimmer = false,
}: Props) {
  const src = resolveLeaderboardCardArtUrl(riotPlayerCardWide, riotPlayerCard);
  if (!src) return null;

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 overflow-hidden transition-opacity duration-500 ${
          featured
            ? "left-[34%] sm:left-[calc(5rem+13.75rem+11.5rem)] opacity-55 group-hover:opacity-70"
            : "left-[38%] sm:left-[calc(5rem+13.75rem+10rem)] opacity-35 group-hover:opacity-50"
        }`}
        style={{
          maskImage: "linear-gradient(to left, black 55%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to left, black 55%, transparent 100%)",
        }}
      >
        <img
          src={src}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-right"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[#0D0D0D]/40 via-transparent to-transparent" />
      </div>
      {shimmer && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-amber-400/10 to-transparent pointer-events-none z-20" />
      )}
    </>
  );
}
