import Link from "next/link";
import type { MomentsGallery } from "@core/contracts";
import { instagramUrl } from "@/lib/env";
import LoungeFeaturedCollage from "./LoungeFeaturedCollage";
import ImageCarousel from "@/components/admin/ImageCarousel";

type Props = {
  gallery: MomentsGallery;
};

function PlayIcon() {
  return (
    <svg className="h-12 w-12 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

export default function GalleryGrid({ gallery }: Props) {
  const { featured, reels, youtube } = gallery;
  const hasReels = reels.length > 0;
  const hasYoutube = youtube != null;
  const hasFeaturedImages = featured != null && featured.images.length > 0;

  return (
    <div className="space-y-16">
      {hasFeaturedImages && featured ? (
        featured.displayMode === "CAROUSEL" ? (
          <div className="relative min-h-[16rem] overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#070b14] sm:aspect-[21/9] sm:min-h-[18rem]">
            <ImageCarousel
              slides={featured.images.map((img) => ({
                src: img.src,
                alt: img.alt,
                caption: img.caption,
              }))}
              className="absolute inset-0 h-full w-full"
              overlay={
                <>
                  <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#070b14] via-[#070b14]/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 z-30 p-6 sm:p-8">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--color-brand)]">
                      {featured.eyebrow}
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
                      {featured.title}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">{featured.subtitle}</p>
                  </div>
                </>
              }
            />
          </div>
        ) : (
          <LoungeFeaturedCollage deck={featured} />
        )
      ) : null}

      {hasReels ? (
        <section>
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-xl font-semibold text-white">Recent posts</h2>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] uppercase tracking-[0.18em] text-white/40 hover:text-[var(--color-brand)]"
            >
              Follow
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reels.map((reel) => (
              <a
                key={reel.id}
                href={reel.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col overflow-hidden rounded-[1.25rem] border border-white/[0.07] bg-white/[0.02] transition-colors hover:border-white/14"
              >
                <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={reel.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
                {reel.title ? (
                  <p
                    className="h-11 truncate px-4 py-3 text-sm leading-5 text-white/50"
                    title={reel.title}
                  >
                    {reel.title}
                  </p>
                ) : (
                  <div className="h-11 shrink-0" aria-hidden />
                )}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {hasYoutube && youtube ? (
        <section>
          <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-white/40">Video</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white">Latest on YouTube</h2>
          <a
            href={youtube.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-6 block overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/14"
          >
            <div className="relative aspect-video w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={youtube.thumbnailUrl}
                alt={youtube.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/45 backdrop-blur-sm">
                  <PlayIcon />
                </div>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="truncate font-medium text-white" title={youtube.title}>
                {youtube.title}
              </p>
              <span className="mt-2 inline-flex text-xs uppercase tracking-[0.18em] text-white/45 group-hover:text-[var(--color-brand)]">
                Watch on YouTube →
              </span>
            </div>
          </a>
        </section>
      ) : null}

      {!hasReels && !hasYoutube && !hasFeaturedImages && (
        <div className="rounded-[1.35rem] border border-white/[0.08] py-20 text-center">
          <p className="text-white/50">Follow us for the latest from the lounge.</p>
          <Link
            href={instagramUrl}
            className="mt-4 inline-flex text-sm text-[var(--color-brand)] hover:underline"
          >
            @ntg_lounge
          </Link>
        </div>
      )}
    </div>
  );
}
