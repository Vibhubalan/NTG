// Client-safe env helpers.
// Server-only env (Google Places) is read directly inside the API route.

const FALLBACK_INSTAGRAM = "https://instagram.com/ntg_lounge";

const rawWhatsApp =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[^\d]/g, "") ?? "";

export const whatsappNumber = rawWhatsApp;

export const instagramUrl =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL || FALLBACK_INSTAGRAM;

export const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL || "";

export const mapsEmbedUrl = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL || "";

export const mapsLink = process.env.NEXT_PUBLIC_GOOGLE_MAPS_LINK || "";

/**
 * Past/hosted tournament cards are non-clickable by default.
 * Set NEXT_PUBLIC_ALLOW_PAST_TOURNAMENT_CLICKS=1 locally if you need to open them in dev.
 */
export const allowPastTournamentClicks =
  process.env.NEXT_PUBLIC_ALLOW_PAST_TOURNAMENT_CLICKS === "1";

/** Gate homepage Plans & Host section until client approves copy (Phase 1 DEV). */
export const showPlansSection = process.env.NEXT_PUBLIC_SHOW_PLANS_SECTION === "1";

export const sponsorEmail = process.env.NEXT_PUBLIC_SPONSOR_EMAIL || "sponsor@ntgesports.com";


export function whatsappInquiryUrl(
  message = "Hi NTG Lounge, I'd like to inquire about a slot.",
) {
  if (!whatsappNumber) return "#";
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function mapsSearchUrl(address: string) {
  if (mapsLink) return mapsLink;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// Coordinate-based embed avoids Google's auto-opened place info card.
// Address-based queries that match a registered place will always pop the
// info window — coordinates render a clean pin instead.
// Set NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL_RAW to override with a custom embed.
export function mapsEmbedFor(coordsOrAddress: string) {
  const rawOverride = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL_RAW;
  if (rawOverride) return rawOverride;
  return `https://www.google.com/maps?q=${encodeURIComponent(coordsOrAddress)}&z=16&hl=en&output=embed`;
}
