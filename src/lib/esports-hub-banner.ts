import type { TournamentRegistrationBanner } from "@core/contracts";

export function buildEsportsHubBannerSlides(
  registration: TournamentRegistrationBanner,
  posterUrl?: string | null,
) {
  const fallback =
    registration.hubBannerUrl ??
    posterUrl ??
    "/images/fc26-bg.png";

  const carousel = (registration.hubCarouselImages ?? []).filter(Boolean);

  const sources =
    carousel.length > 0 ? carousel : [fallback];

  return sources.map((src, i) => ({
    src,
    alt: registration.title,
    caption: i === 0 ? registration.detail : undefined,
  }));
}
