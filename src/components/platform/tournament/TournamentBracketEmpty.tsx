import { challongePageUrl } from "@/lib/challonge";

type Props = {
  url: string;
};

export default function TournamentBracketEmpty({ url }: Props) {
  const pageUrl = challongePageUrl(url);

  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold text-white/80">Bracket unavailable</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/45">
        Add <code className="text-white/60">CHALLONGE_API_KEY</code> to your env to pull live
        bracket data into NTG UI. Until then, open the bracket on Challonge directly.
      </p>
      {pageUrl ? (
        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 transition-colors hover:border-white/20 hover:text-white"
        >
          Open on Challonge
        </a>
      ) : null}
    </div>
  );
}
