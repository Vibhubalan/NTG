/**
 * Generates slug variants to handle case-insensitivity, URI decoding,
 * and Roman <-> Arabic numeral mismatches (e.g. auc-cup-3 <-> auc-cup-iii, auc-cup-1 <-> auc-cup-i).
 */
export function getSlugVariants(slug: string): string[] {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // ignore
  }

  const trimmed = decoded.trim();
  const lower = trimmed.toLowerCase();
  const variants = new Set<string>([slug, trimmed, lower]);

  const romanToArabic: Record<string, string> = {
    "-i": "-1",
    "-ii": "-2",
    "-iii": "-3",
    "-iv": "-4",
    "-v": "-5",
    "-vi": "-6",
  };
  const arabicToRoman: Record<string, string> = {
    "-1": "-i",
    "-2": "-ii",
    "-3": "-iii",
    "-4": "-iv",
    "-5": "-v",
    "-6": "-vi",
  };

  for (const [roman, arabic] of Object.entries(romanToArabic)) {
    if (lower.endsWith(roman)) {
      variants.add(lower.slice(0, -roman.length) + arabic);
    }
  }

  for (const [arabic, roman] of Object.entries(arabicToRoman)) {
    if (lower.endsWith(arabic)) {
      variants.add(lower.slice(0, -arabic.length) + roman);
    }
  }

  return Array.from(variants);
}

/** Prisma where clause that matches any slug variant (case-insensitive). */
export function slugWhere(slug: string): {
  OR: { slug: { equals: string; mode: "insensitive" } }[];
} {
  return {
    OR: getSlugVariants(slug).map((s) => ({
      slug: { equals: s, mode: "insensitive" as const },
    })),
  };
}
