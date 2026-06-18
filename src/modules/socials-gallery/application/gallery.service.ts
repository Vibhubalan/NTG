import { prisma } from "@core/database/client";
import type { FeaturedDeck, GalleryPreview, MomentsGallery, ReelPreview } from "@core/contracts";
import { loungeFeaturedDeck } from "@/lib/moments-featured";
import { getActiveFeaturedDeck, listActiveReels, extractReelShortcode } from "./moments-admin.service";
import { getInstagramReelPreviews } from "./instagram.service";
import { getYoutubeLatestPreview } from "./youtube.service";
import { serverEnv } from "@core/config/env.server";

export async function getFeaturedDeck(): Promise<FeaturedDeck | null> {
  try {
    const deck = await getActiveFeaturedDeck();
    if (deck) return deck;
  } catch {
    // DB may not be migrated yet
  }
  return loungeFeaturedDeck;
}

function reelPreviewFromDb(reel: {
  reelUrl: string;
  coverUrl: string | null;
  caption: string | null;
}): ReelPreview {
  const id = extractReelShortcode(reel.reelUrl) ?? reel.reelUrl;
  return {
    id,
    permalink: reel.reelUrl,
    thumbnailUrl: reel.coverUrl ?? "/images/reel-preview-fallback.svg",
    title: reel.caption,
  };
}

async function getReelsFromDb(limit: number): Promise<ReelPreview[]> {
  const rows = await listActiveReels();
  return rows.slice(0, limit).map(reelPreviewFromDb);
}

export async function getMomentsGallery(): Promise<MomentsGallery> {
  const [featured, youtube] = await Promise.all([
    getFeaturedDeck(),
    getYoutubeLatestPreview(),
  ]);

  let reels: ReelPreview[] = [];
  if (serverEnv.databaseUrl) {
    try {
      const dbReels = await getReelsFromDb(6);
      if (dbReels.length > 0) {
        reels = dbReels;
      }
    } catch {
      // fall through to env reels
    }
  }
  if (reels.length === 0) {
    reels = await getInstagramReelPreviews(3);
  }

  return {
    featured,
    reels,
    youtube,
  };
}

// Legacy — kept for landing-home preview and /api/gallery
export async function getGalleryPreview(limit = 6): Promise<GalleryPreview> {
  const items = await prisma.galleryItem.findMany({
    where: { source: { active: true } },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: limit,
    include: { source: true },
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      platform: item.source.platform,
      mediaType: item.mediaType,
      embedUrl: item.embedUrl,
      thumbnailUrl: item.thumbnailUrl,
      caption: item.caption,
      publishedAt: item.publishedAt?.toISOString() ?? null,
    })),
  };
}
