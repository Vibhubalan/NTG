import { prisma } from "@core/database/client";
import type { FeaturedDeck } from "@core/contracts";
import type { MomentsDisplayMode } from "@prisma/client";

export async function listFeaturedDecksAdmin() {
  return prisma.momentsFeaturedDeck.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getActiveFeaturedDeck(): Promise<FeaturedDeck | null> {
  const deck = await prisma.momentsFeaturedDeck.findFirst({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!deck || deck.images.length === 0) return null;

  return {
    slug: deck.slug,
    eyebrow: deck.eyebrow,
    title: deck.title,
    subtitle: deck.subtitle,
    displayMode: deck.displayMode,
    images: deck.images.map((img) => ({
      src: img.url,
      alt: img.alt,
      caption: img.caption ?? undefined,
      gridClass: "",
    })),
  };
}

export async function upsertFeaturedDeckAdmin(input: {
  id?: string;
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  displayMode?: MomentsDisplayMode;
  active?: boolean;
  sortOrder?: number;
}) {
  if (input.id) {
    return prisma.momentsFeaturedDeck.update({
      where: { id: input.id },
      data: {
        slug: input.slug.trim(),
        eyebrow: input.eyebrow.trim(),
        title: input.title.trim(),
        subtitle: input.subtitle.trim(),
        displayMode: input.displayMode,
        active: input.active,
        sortOrder: input.sortOrder,
      },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
  }

  return prisma.momentsFeaturedDeck.create({
    data: {
      slug: input.slug.trim(),
      eyebrow: input.eyebrow.trim(),
      title: input.title.trim(),
      subtitle: input.subtitle.trim(),
      displayMode: input.displayMode ?? "BLEND",
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function deleteFeaturedDeckAdmin(id: string) {
  await prisma.momentsFeaturedDeck.delete({ where: { id } });
}

export async function addFeaturedImageAdmin(input: {
  deckId: string;
  url: string;
  alt: string;
  caption?: string;
  sortOrder?: number;
}) {
  const deck = await prisma.momentsFeaturedDeck.findUnique({
    where: { id: input.deckId },
    include: { images: { orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!deck) return null;

  const sortOrder = input.sortOrder ?? (deck.images[0]?.sortOrder ?? -1) + 1;
  return prisma.momentsFeaturedImage.create({
    data: {
      deckId: input.deckId,
      url: input.url,
      alt: input.alt.trim(),
      caption: input.caption?.trim() || null,
      sortOrder,
    },
  });
}

export async function updateFeaturedImageAdmin(
  id: string,
  input: { url?: string; alt?: string; caption?: string; sortOrder?: number },
) {
  return prisma.momentsFeaturedImage.update({
    where: { id },
    data: {
      url: input.url,
      alt: input.alt?.trim(),
      caption: input.caption?.trim() || null,
      sortOrder: input.sortOrder,
    },
  });
}

export async function deleteFeaturedImageAdmin(id: string) {
  await prisma.momentsFeaturedImage.delete({ where: { id } });
}

// ─── Reels ───────────────────────────────────────────────────────────────────

export async function listReelsAdmin() {
  return prisma.socialReelPost.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function listActiveReels() {
  return prisma.socialReelPost.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function upsertReelAdmin(input: {
  id?: string;
  reelUrl: string;
  coverUrl?: string;
  caption?: string;
  sortOrder?: number;
  active?: boolean;
}) {
  const reelUrl = input.reelUrl.trim();
  if (input.id) {
    return prisma.socialReelPost.update({
      where: { id: input.id },
      data: {
        reelUrl,
        coverUrl: input.coverUrl?.trim() || null,
        caption: input.caption?.trim() || null,
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  }

  return prisma.socialReelPost.create({
    data: {
      reelUrl,
      coverUrl: input.coverUrl?.trim() || null,
      caption: input.caption?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      active: input.active ?? true,
    },
  });
}

export async function deleteReelAdmin(id: string) {
  await prisma.socialReelPost.delete({ where: { id } });
}

export function extractReelShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}
