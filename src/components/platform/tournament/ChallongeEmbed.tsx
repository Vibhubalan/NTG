import { challongeEmbedSrc, challongePageUrl } from "@/lib/challonge";

type Props = {
  url: string;
  title?: string;
};

export default function ChallongeEmbed({ url, title = "Tournament bracket" }: Props) {
  const embedSrc = challongeEmbedSrc(url);
  const pageUrl = challongePageUrl(url);

  if (!embedSrc) return null;

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0A0A0A]/80 shadow-2xl">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-rose-400/80">
            Live Bracket
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-white">Challonge</p>
        </div>
        {pageUrl ? (
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 transition-colors hover:border-white/20 hover:text-white"
          >
            Open on Challonge
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M7 17L17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </a>
        ) : null}
      </div>
      <div className="relative bg-[#050505] p-3 sm:p-4">
        <iframe
          src={embedSrc}
          title={title}
          loading="lazy"
          className="min-h-[32rem] w-full rounded-xl border border-white/[0.06] bg-white"
          allowFullScreen
        />
      </div>
    </div>
  );
}
