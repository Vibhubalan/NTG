import { challongeEmbedSrc } from "@/lib/challonge";

type Props = {
  url: string;
  title?: string;
};

/** Minimal Challonge module iframe — bracket only, no chrome. */
export default function ChallongeEmbed({ url, title = "Tournament bracket" }: Props) {
  const embedSrc = challongeEmbedSrc(url);
  if (!embedSrc) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#090c14]">
      <iframe
        src={embedSrc}
        title={title}
        loading="lazy"
        className="min-h-[28rem] w-full border-0 bg-[#090c14] sm:min-h-[36rem]"
        allowFullScreen
      />
    </div>
  );
}
