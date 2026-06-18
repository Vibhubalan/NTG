type Props = {
  count: number;
};

export default function TournamentPlayersRegistered({ count }: Props) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.08] bg-[#0A0A0A]/80 p-6 shadow-xl backdrop-blur-xl">
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">
        Players Registered
      </p>
      <p className="mt-3 font-display text-5xl font-black tracking-tight text-white">
        {count}
      </p>
      <p className="mt-2 text-sm text-white/45">
        {count === 1 ? "Player locked in so far." : "Players locked in so far."}
      </p>
    </div>
  );
}
