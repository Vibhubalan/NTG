import { brand } from "@/lib/data";
import { discordUrl, instagramUrl } from "@/lib/env";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export default function LocalBusinessJsonLd() {
  const [latitude, longitude] = brand.coords.split(",").map((value) => value.trim());

  const sameAs = [
    instagramUrl,
    discordUrl,
    brand.link ? `https://${brand.link}` : "",
  ].filter((url) => url && url !== "#");

  const schema = {
    "@context": "https://schema.org",
    "@type": "EntertainmentBusiness",
    "@id": SITE_URL,
    name: `${brand.name} — ${brand.meaning}`,
    alternateName: ["NTG Esports", "Namma Tulunad Gaming", "ntgesports"],
    url: SITE_URL,
    image: `${SITE_URL}/ntg-logo.png`,
    description: SITE_DESCRIPTION,
    address: {
      "@type": "PostalAddress",
      streetAddress: brand.address,
      addressLocality: "Mangaluru",
      addressRegion: "Karnataka",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude,
      longitude,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "10:00",
        closes: "23:00",
      },
    ],
    sameAs,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
