/** Shown when a Challonge link exists but live bracket data is not ready yet. */
export default function TournamentBracketEmpty() {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold text-white/85">Bracket coming soon</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/45">
        Will be updated soon.
      </p>
    </div>
  );
}
