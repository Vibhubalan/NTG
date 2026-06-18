export type FeaturedDeckImage = {
  src: string;
  alt: string;
  gridClass: string;
  caption?: string;
};

export type FeaturedDeck = {
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  displayMode?: "BLEND" | "CAROUSEL";
  images: FeaturedDeckImage[];
};

export type ReelPreview = {
  id: string;
  permalink: string;
  thumbnailUrl: string;
  title: string | null;
};

export type YoutubePreview = {
  videoId: string;
  title: string;
  permalink: string;
  thumbnailUrl: string;
  publishedAt: string | null;
};

export type MomentsGallery = {
  featured: FeaturedDeck | null;
  reels: ReelPreview[];
  youtube: YoutubePreview | null;
};
