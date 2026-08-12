"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { ListingPreview } from "@core/contracts/roster-listings";
import ListingCard from "./ListingCard";

type Tab = "ALL" | "JOB" | "ROSTER_TRYOUT";

type Props = {
  listings: ListingPreview[];
  initialType?: string | null;
};

export default function ListingsBoard({ listings, initialType }: Props) {
  const initialTab: Tab =
    initialType === "JOB" || initialType === "ROSTER_TRYOUT" ? initialType : "ALL";
  const [tab, setTab] = useState<Tab>(initialTab);

  const filtered = useMemo(() => {
    if (tab === "ALL") return listings;
    return listings.filter((l) => l.type === tab);
  }, [listings, tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "JOB", label: "Jobs" },
    { id: "ROSTER_TRYOUT", label: "Team tryouts" },
  ];

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-5 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:pb-6">
        <div className="flex w-fit items-center gap-1 rounded-full border border-white/15 bg-black/40 p-1.5 shadow-inner backdrop-blur-md">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors duration-300 sm:px-5 sm:py-2.5 sm:text-xs ${
                tab === t.id
                  ? "text-black"
                  : "text-white/50 hover:bg-white/5 hover:text-white/90"
              }`}
            >
              {tab === t.id && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 z-0 rounded-full bg-[var(--color-brand)] shadow-[0_4px_14px_0_rgba(94,234,212,0.35)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>

        {tab !== "ALL" ? (
          <span className="text-xs font-medium tracking-wide text-white/35">
            {filtered.length} in this category
          </span>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center backdrop-blur-sm sm:py-24">
          <p className="font-display text-xl text-white/70">No opportunities available</p>
          <p className="mx-auto mt-3 max-w-sm text-sm text-white/40">
            Check back soon or browse other categories to see our open listings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
