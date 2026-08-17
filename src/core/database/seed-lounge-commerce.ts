import { GamepassCategory, HostOfferingType, PrismaClient } from "@prisma/client";

type PlanSeed = {
  slug: string;
  category: GamepassCategory;
  title: string;
  subtitle?: string;
  description?: string;
  priceDay?: number;
  priceNight?: number;
  priceSingle?: number;
  priceController?: number;
  validityText?: string;
  timeWindowText?: string;
  badge?: string;
  featuredOnHome?: boolean;
  inquiryOnly?: boolean;
  sortOrder: number;
  whatsappMessage?: string;
};

const GAMEPASS_PLANS: PlanSeed[] = [
  {
    slug: "ps-1-hour",
    category: "PLAYSTATION",
    title: "1 Hour",
    subtitle: "Day & night rates",
    priceDay: 119,
    priceNight: 139,
    badge: "Popular",
    featuredOnHome: true,
    sortOrder: 10,
    whatsappMessage: "Hi NTG Lounge, I'd like to book a 1 hour PlayStation session.",
  },
  {
    slug: "ps-3-hour",
    category: "PLAYSTATION",
    title: "3 Hours",
    subtitle: "Day & night rates",
    priceDay: 349,
    priceNight: 409,
    badge: "Most popular",
    featuredOnHome: true,
    sortOrder: 20,
    whatsappMessage: "Hi NTG Lounge, I'd like to book a 3 hour PlayStation session.",
  },
  {
    slug: "ps-monthly-unlimited",
    category: "PLAYSTATION",
    title: "Monthly Unlimited",
    subtitle: "Day hours gaming package",
    description: "Enjoy unlimited gaming access during day hours.",
    priceSingle: 6000,
    validityText: "1 month",
    timeWindowText: "Day hours only",
    badge: "Monthly Pass",
    featuredOnHome: true,
    sortOrder: 30,
    whatsappMessage: "Hi NTG Lounge, I'd like to book the Monthly Unlimited pack (₹6000, day hours only).",
  },
  {
    slug: "ps-3-hour-pack",
    category: "PLAYSTATION",
    title: "3 Hour Pack",
    subtitle: "Flexible validity",
    priceSingle: 300,
    validityText: "1 day",
    featuredOnHome: true,
    sortOrder: 40,
    whatsappMessage: "Hi NTG Lounge, I'd like the 3 hour pack (₹300, 1 day validity).",
  },
  {
    slug: "ps-single-player",
    category: "PLAYSTATION",
    title: "Single Player",
    subtitle: "Per hour",
    priceSingle: 80,
    sortOrder: 50,
    whatsappMessage: "Hi NTG Lounge, I'd like a single player PlayStation session (₹80/hr).",
  },
  {
    slug: "ps-group-2-4",
    category: "PLAYSTATION",
    title: "Group Play",
    subtitle: "2-4 players · per person per hour",
    priceSingle: 70,
    sortOrder: 55,
    whatsappMessage: "Hi NTG Lounge, I'd like a group PlayStation session for 2-4 players (₹70/person/hr).",
  },
  {
    slug: "ps-5-hour",
    category: "PLAYSTATION",
    title: "5 Hours",
    subtitle: "Day & night rates",
    priceDay: 559,
    priceNight: 666,
    sortOrder: 70,
    whatsappMessage: "Hi NTG Lounge, I'd like to book a 5 hour PlayStation session.",
  },
  {
    slug: "ps-6-hour-pack",
    category: "PLAYSTATION",
    title: "6 Hour Pack",
    priceSingle: 500,
    validityText: "1 day",
    sortOrder: 80,
    whatsappMessage: "Hi NTG Lounge, I'd like the 6 hour pack (₹500, 1 day validity).",
  },
  {
    slug: "pc-hourly",
    category: "PC",
    title: "PC Hourly",
    subtitle: "High-spec gaming rigs",
    priceSingle: 80,
    sortOrder: 10,
    whatsappMessage: "Hi NTG Lounge, I'd like to book a PC gaming session.",
  },
  {
    slug: "pc-sweat-pack",
    category: "PC",
    title: "Sweat Pack",
    subtitle: "Extended grind sessions",
    inquiryOnly: true,
    sortOrder: 20,
    whatsappMessage: "Hi NTG Lounge, I'd like to inquire about the Sweat Pack for PC.",
  },
  {
    slug: "pc-grinder-pack",
    category: "PC",
    title: "Grinder Pack",
    subtitle: "For serious grinders",
    inquiryOnly: true,
    sortOrder: 30,
    whatsappMessage: "Hi NTG Lounge, I'd like to inquire about the Grinder Pack for PC.",
  },
];

const HOST_OFFERINGS = [
  {
    type: HostOfferingType.SPONSORSHIP,
    title: "Partner with NTG",
    summary: "Put your brand in front of Mangaluru's competitive gaming community.",
    body: "From tournament title sponsorship to lounge branding and social reach, we work with partners who want real visibility with players, creators, and event crowds.",
    highlights: [
      "Tournament & cup branding",
      "In-lounge visibility",
      "Social and event coverage",
    ],
  },
  {
    type: HostOfferingType.BIRTHDAY,
    title: "Birthday at NTG",
    summary: "Host an unforgettable birthday party at the lounge.",
    body: "Private stations, squad setups, and a vibe built for celebrations. Tell us your headcount and date. We'll tailor a package.",
    highlights: [
      "Dedicated PS5 / PC stations",
      "Flexible party durations",
      "Custom packages on request",
    ],
  },
  {
    type: HostOfferingType.PRIVATE_EVENT,
    title: "Private Events",
    summary: "Rent NTG for your event, meetup, or community night.",
    body: "Whether it's a college society night, brand activation, or private tournament, the full lounge can be yours.",
    highlights: [
      "Full or partial lounge rental",
      "Tournament-ready setups",
      "Staff support available",
    ],
  },
] as const;

export async function seedLoungeCommerce(prisma: PrismaClient): Promise<void> {
  // Clean up outdated plans
  await prisma.gamepassPlan.deleteMany({
    where: { slug: { in: ["ps-happy-hour", "ps-controller-hour"] } },
  });

  for (const plan of GAMEPASS_PLANS) {
    await prisma.gamepassPlan.upsert({
      where: { slug: plan.slug },
      create: plan,
      update: {
        category: plan.category,
        title: plan.title,
        subtitle: plan.subtitle,
        description: plan.description,
        priceDay: plan.priceDay,
        priceNight: plan.priceNight,
        priceSingle: plan.priceSingle,
        priceController: plan.priceController,
        validityText: plan.validityText,
        timeWindowText: plan.timeWindowText,
        badge: plan.badge,
        featuredOnHome: plan.featuredOnHome ?? false,
        inquiryOnly: plan.inquiryOnly ?? false,
        sortOrder: plan.sortOrder,
        whatsappMessage: plan.whatsappMessage,
        active: true,
      },
    });
  }

  for (const offering of HOST_OFFERINGS) {
    await prisma.hostOffering.upsert({
      where: { type: offering.type },
      create: offering,
      update: {
        title: offering.title,
        summary: offering.summary,
        body: offering.body,
        highlights: offering.highlights,
        active: true,
      },
    });
  }

  const SPONSOR_LOGOS = [
    {
      name: "AMD",
      logoUrl: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=200&h=120&fit=crop",
      websiteUrl: "https://www.amd.com",
      sortOrder: 10,
      active: true,
    },
    {
      name: "AORUS",
      logoUrl: "/gigabyte.svg",
      websiteUrl: "https://aorus.com",
      sortOrder: 20,
      active: true,
    }
  ];

  for (const sponsor of SPONSOR_LOGOS) {
    const existing = await prisma.sponsorLogo.findFirst({
      where: { name: sponsor.name }
    });
    if (existing) {
      await prisma.sponsorLogo.update({
        where: { id: existing.id },
        data: sponsor,
      });
    } else {
      await prisma.sponsorLogo.create({
        data: sponsor,
      });
    }
  }
}
