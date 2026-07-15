"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { whatsappInquiryUrl, sponsorEmail } from "@/lib/env";
import { hostInquiryWhatsappMessage } from "@/lib/inquiry-messages";

type HostTabId = "birthday" | "events" | "sponsors";

interface TabContent {
  id: HostTabId;
  label: string;
  category: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  badgeText: string;
  imageOverlayTitle: string;
  highlights: string[];
  primaryBtnText: string;
  primaryBtnHref: string;
  secondaryBtnText: string;
  secondaryBtnHref: string;
  accentColorClass: string;
  tagColorClass: string;
  badgePulseColor: string;
}

const TAB_DATA: Record<HostTabId, TabContent> = {
  birthday: {
    id: "birthday",
    label: "Celebrations",
    category: "Birthdays & Parties",
    title: "Level Up Your Celebration.",
    description: "Turn your birthday into an unforgettable gaming experience. Gather your squad, enjoy premium gaming setups, exclusive birthday offers, great food, and an action-packed celebration made for gamers.",
    imageSrc: "/images/celebrations.png",
    imageAlt: "Birthday Party at NTG Lounge",
    badgeText: "Now Booking",
    imageOverlayTitle: "The ultimate gaming party experience.",
    highlights: [
      "Exclusive Birthday Party Packages",
      "Special Group Pass Discounts",
      "Private Gaming Area for Your Squad",
      "Food & Beverages Available",
      "Bring Your Own Birthday Cake & Decorations"
    ],
    primaryBtnText: "View Packages",
    primaryBtnHref: "/birthday",
    secondaryBtnText: "Inquire via WhatsApp",
    secondaryBtnHref: whatsappInquiryUrl(hostInquiryWhatsappMessage("birthday")),
    accentColorClass: "text-[var(--color-iris)]",
    tagColorClass: "border-[var(--color-iris)]/30 bg-[var(--color-iris)]/10 text-[var(--color-iris)]",
    badgePulseColor: "bg-[var(--color-iris)]",
  },
  events: {
    id: "events",
    label: "Private Events",
    category: "Venue Takeover & Rentals",
    title: "Host Your Next Event at NTG.",
    description: "Looking for a unique venue? Reserve NTG for esports tournaments, college events, team meetups, community gatherings, product launches, or private gaming sessions. Our premium gaming space is available for exclusive bookings tailored to your event.",
    imageSrc: "/images/private-events.png",
    imageAlt: "Private Event at NTG Lounge",
    badgeText: "Exclusive Venue",
    imageOverlayTitle: "Legendary group events and tournaments.",
    highlights: [
      "Private Room or Full Lounge Rental",
      "Ideal for Tournaments, Meetups & Community Events",
      "High-Speed Gaming Setups & Premium PCs",
      "Flexible Venue Layouts for Your Requirements",
      "Food & Beverage Options Available"
    ],
    primaryBtnText: "View Details",
    primaryBtnHref: "/events",
    secondaryBtnText: "Inquire via WhatsApp",
    secondaryBtnHref: whatsappInquiryUrl(hostInquiryWhatsappMessage("events")),
    accentColorClass: "text-[var(--color-brand)]",
    tagColorClass: "border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 text-[var(--color-brand)]",
    badgePulseColor: "bg-[var(--color-brand)]",
  },
  sponsors: {
    id: "sponsors",
    label: "Sponsorships",
    category: "BRAND PARTNERSHIPS",
    title: "Partner with NTG.",
    description: "Join the brands shaping Mangaluru's growing esports scene. Following successful partnerships for AUC Cup II, including sponsors like AORUS, NTG offers opportunities to connect with an engaged community through tournaments, events, and in-lounge experiences.",
    imageSrc: "/images/sponsorships.jpg",
    imageAlt: "Gaming Rig Setup sponsored by partners",
    badgeText: "Brand Partnerships",
    imageOverlayTitle: "Fuel local esports & competitive tournaments.",
    highlights: [
      "Title Sponsorship for Tournaments & Events",
      "Brand Visibility Across NTG Lounge",
      "Social Media & Event Promotions",
      "Product Showcases & Community Activations",
      "Reach College & Regional Gaming Audiences"
    ],
    primaryBtnText: "Sponsor Details",
    primaryBtnHref: "/sponsors",
    secondaryBtnText: "Inquire via Email",
    secondaryBtnHref: `mailto:${sponsorEmail}`,
    accentColorClass: "text-[var(--color-brand)]",
    tagColorClass: "border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 text-[var(--color-brand)]",
    badgePulseColor: "bg-[var(--color-brand)]",
  }
};

export default function BirthdaySection() {
  const [activeTab, setActiveTab] = useState<HostTabId>("events");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const content = TAB_DATA[activeTab];

  return (
    <section id="birthday" className="relative mx-auto w-full max-w-7xl scroll-mt-28 px-5 py-24 sm:py-32">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-30">
        <div className="h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,_var(--color-iris)_0%,_transparent_70%)]" />
      </div>

      {/* Tabs Selector Switcher */}
      <div className="flex flex-col items-center mb-16">
        <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--color-brand)]/80 mb-6">
          06 · Host at NTG
        </span>
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.02] p-1.5 backdrop-blur-md">
          {(["events", "sponsors", "birthday"] as HostTabId[]).map((tabId) => {
            const isTabActive = activeTab === tabId;
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`relative rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors duration-300 sm:px-5 sm:py-2.5 sm:text-xs sm:tracking-widest ${
                  isTabActive ? "text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {isTabActive && (
                  <motion.span
                    layoutId="active-host-tab-bg"
                    className="absolute inset-0 rounded-full bg-white"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{TAB_DATA[tabId].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Card Layout */}
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
        {/* Left Side: Visuals */}
        <div className="relative h-[400px] w-full sm:h-[500px] rounded-[32px] overflow-hidden border border-white/10 bg-white/5">
          <div className="grid grid-cols-1 grid-rows-1 absolute inset-0">
            {(["events", "sponsors", "birthday"] as HostTabId[]).map((tabId) => {
              const isTabActive = activeTab === tabId;
              const tabContent = TAB_DATA[tabId];
              return (
                <motion.div
                  key={tabId}
                  initial={isTabActive ? "active" : "inactive"}
                  animate={isTabActive ? "active" : "inactive"}
                  variants={{
                    active: {
                      opacity: 1,
                      scale: 1,
                      visibility: "visible",
                      transition: { duration: 0.4 }
                    },
                    inactive: {
                      opacity: 0,
                      scale: 0.98,
                      transition: { duration: 0.3 },
                      transitionEnd: { visibility: "hidden" }
                    }
                  }}
                  className="col-start-1 row-start-1 absolute inset-0"
                  style={{
                    pointerEvents: isTabActive ? "auto" : "none",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/20 to-transparent z-10" />
                  <Image
                    src={tabContent.imageSrc}
                    alt={tabContent.imageAlt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    priority={tabId === "events"}
                  />
                  <div className="absolute bottom-8 left-8 z-20 max-w-[280px]">
                    <div className={`inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 backdrop-blur-md mb-4`}>
                      <span className={`flex h-2 w-2 rounded-full ${tabContent.badgePulseColor} animate-pulse`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white">{tabContent.badgeText}</span>
                    </div>
                    <p className="font-display text-xl font-semibold text-white">
                      {tabContent.imageOverlayTitle}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        {/* Right Side: Content Stack (Grid layout prevents height twitching and shifts) */}
        <div className="grid grid-cols-1 grid-rows-1 items-start relative w-full min-h-[460px]">
          {(["events", "sponsors", "birthday"] as HostTabId[]).map((tabId) => {
            const isTabActive = activeTab === tabId;
            const tabContent = TAB_DATA[tabId];
            return (
              <motion.div
                key={tabId}
                initial={isTabActive ? "active" : "inactive"}
                animate={isTabActive ? "active" : "inactive"}
                variants={{
                  active: {
                    opacity: 1,
                    x: 0,
                    visibility: "visible",
                    transition: { duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }
                  },
                  inactive: {
                    opacity: 0,
                    x: 12,
                    transition: { duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] },
                    transitionEnd: { visibility: "hidden" }
                  }
                }}
                className="col-start-1 row-start-1 w-full"
                style={{
                  pointerEvents: isTabActive ? "auto" : "none",
                }}
              >
                <span className={`text-[10px] font-bold uppercase tracking-[0.3em] ${tabContent.accentColorClass}`}>
                  {tabContent.category}
                </span>
                <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  {tabContent.title}
                </h2>
                <p className="mt-6 text-[15px] leading-relaxed text-white/60">
                  {tabContent.description}
                </p>

                <ul className="mt-8 space-y-4 text-[14px] text-white/80">
                  {tabContent.highlights.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/10">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10 flex flex-wrap gap-4">
                  <a
                    href={tabContent.secondaryBtnHref}
                    target={tabContent.id === "sponsors" ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (tabContent.secondaryBtnHref.startsWith("mailto:")) {
                        e.preventDefault();
                        const email = tabContent.secondaryBtnHref.replace("mailto:", "").split("?")[0];
                        
                        // Copy email to clipboard just in case
                        navigator.clipboard.writeText(email);
                        setCopiedEmail(true);
                        setTimeout(() => setCopiedEmail(false), 2000);
                        
                        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                        if (isMobile) {
                          // On phone, native mailto works perfectly to open the default mail app (like Gmail or iOS Mail app)
                          window.location.href = `mailto:${email}`;
                        } else {
                          // On desktop, open Gmail Compose inside the user's Gmail Inbox workspace (pops a draft window in bottom-right)
                          const gmailUrl = `https://mail.google.com/mail/?extsrc=mailto&url=mailto:${encodeURIComponent(email)}`;
                          window.open(gmailUrl, "_blank");
                        }
                      }
                    }}
                    className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-8 py-4 text-[12px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:bg-gray-200 hover:scale-105"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {tabContent.id === "sponsors" && copiedEmail ? "Email Copied!" : tabContent.secondaryBtnText}
                      {tabContent.id !== "sponsors" && (
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
                        </svg>
                      )}
                    </span>
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
