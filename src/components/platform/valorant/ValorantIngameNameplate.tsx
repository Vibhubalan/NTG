type Props = {
  name: string;
  className?: string;
};

/** Full-width translucent in-game name bar, sits directly above rank on player card. */
export default function ValorantIngameNameplate({ name, className = "" }: Props) {
  return (
    <div
      className={`w-full border-y border-white/20 bg-white/20 px-3 py-1.5 backdrop-blur-sm ${className}`}
    >
      <p className="truncate text-center font-display text-[11px] font-bold uppercase tracking-[0.08em] text-white drop-shadow-sm sm:text-xs">
        {name}
      </p>
    </div>
  );
}
