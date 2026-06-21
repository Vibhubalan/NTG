"use client";

import { useEffect, useState } from "react";
import ImageUploadField from "@/components/admin/ImageUploadField";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/30 transition-all duration-200";

const labelClass = "text-[10px] font-bold uppercase tracking-wider text-white/40";

type HomepageContent = {
  hero: {
    headline1: string;
    headline2: string;
    subtext: string;
    ctaLabel: string;
    ctaUrl: string;
    secondaryCtaLabel: string;
    secondaryCtaUrl: string;
  };
  specs: { label: string; value: string }[];
  features: {
    heading: string;
    items: { title: string; description: string }[];
  };
  hours: string;
  performance?: {
    championshipSlides: string[];
    auctionNightsImage: string;
  };
};

const DEFAULT_SPECS = [
  { label: "", value: "" },
  { label: "", value: "" },
  { label: "", value: "" },
  { label: "", value: "" },
];

export default function AdminHomepageEditor() {
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/homepage")
      .then((r) => r.json())
      .then((d) => {
        setContent(d.content as HomepageContent);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load homepage content.");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!content || saving) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
      } else {
        setMessage("Homepage content saved successfully.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function updateHero(field: keyof HomepageContent["hero"], value: string) {
    if (!content) return;
    setContent({ ...content, hero: { ...content.hero, [field]: value } });
  }

  function updateSpec(i: number, field: "label" | "value", value: string) {
    if (!content) return;
    const next = [...content.specs];
    next[i] = { ...next[i], [field]: value };
    setContent({ ...content, specs: next });
  }

  function updateFeatureHeading(value: string) {
    if (!content) return;
    setContent({ ...content, features: { ...content.features, heading: value } });
  }

  function updateFeatureItem(i: number, field: "title" | "description", value: string) {
    if (!content) return;
    const next = [...content.features.items];
    next[i] = { ...next[i], [field]: value };
    setContent({ ...content, features: { ...content.features, items: next } });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {error ?? "Failed to load content."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save header */}
      <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/90">Homepage Editor</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-white tracking-tight">Edit Homepage Content</h1>
          <p className="mt-1 text-xs text-white/40">Changes here update live text and labels on the public homepage.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-white/40 hover:text-white">✕</button>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-white/40 hover:text-white">✕</button>
        </div>
      )}

      {/* Hero Section */}
      <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0c1424]/20 p-6 shadow-lg backdrop-blur-sm">
        <div className="border-b border-white/[0.04] pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">Hero Section</h2>
          <p className="mt-1 text-[10px] text-emerald-400/80"><span className="font-semibold text-emerald-400/90 uppercase tracking-wide">Appears on:</span> Homepage hero banner</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={labelClass}>Headline Line 1</label>
            <input className={inputClass} value={content.hero.headline1} onChange={(e) => updateHero("headline1", e.target.value)} placeholder="WHERE LEGENDS" />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Headline Line 2</label>
            <input className={inputClass} value={content.hero.headline2} onChange={(e) => updateHero("headline2", e.target.value)} placeholder="ARE MADE" />
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Sub-text</label>
          <textarea
            className={`${inputClass} min-h-[4rem] resize-y`}
            value={content.hero.subtext}
            onChange={(e) => updateHero("subtext", e.target.value)}
            placeholder="Join the premier esports community..."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={labelClass}>Primary CTA Label</label>
            <input className={inputClass} value={content.hero.ctaLabel} onChange={(e) => updateHero("ctaLabel", e.target.value)} placeholder="Join Now" />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Primary CTA URL</label>
            <input className={inputClass} value={content.hero.ctaUrl} onChange={(e) => updateHero("ctaUrl", e.target.value)} placeholder="/register" />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Secondary CTA Label</label>
            <input className={inputClass} value={content.hero.secondaryCtaLabel} onChange={(e) => updateHero("secondaryCtaLabel", e.target.value)} placeholder="Explore Events" />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Secondary CTA URL</label>
            <input className={inputClass} value={content.hero.secondaryCtaUrl} onChange={(e) => updateHero("secondaryCtaUrl", e.target.value)} placeholder="/esports" />
          </div>
        </div>
      </section>

      {/* Performance Images Section */}
      <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0c1424]/20 p-6 shadow-lg backdrop-blur-sm">
        <div className="border-b border-white/[0.04] pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">Performance Media</h2>
          <p className="mt-1 text-[10px] text-emerald-400/80"><span className="font-semibold text-emerald-400/90 uppercase tracking-wide">Appears on:</span> Engineered for Performance section</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-3">Championship Arena Slides</h3>
            <p className="text-xs text-white/50 mb-3">Add image URLs for the main rotating slideshow card.</p>
            <div className="space-y-2">
              {(content.performance?.championshipSlides || []).map((slide, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={inputClass}
                    value={slide}
                    onChange={(e) => {
                      const next = [...(content.performance?.championshipSlides || [])];
                      next[i] = e.target.value;
                      setContent({ ...content, performance: { ...content.performance!, championshipSlides: next } });
                    }}
                    placeholder="/arena/image.png"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = (content.performance?.championshipSlides || []).filter((_, idx) => idx !== i);
                      setContent({ ...content, performance: { ...content.performance!, championshipSlides: next } });
                    }}
                    className="shrink-0 rounded-xl bg-red-500/10 px-3 text-red-400 hover:bg-red-500/20"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const next = [...(content.performance?.championshipSlides || []), ""];
                  setContent({
                    ...content,
                    performance: {
                      championshipSlides: next,
                      auctionNightsImage: content.performance?.auctionNightsImage || "",
                    },
                  });
                }}
                className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                + Add Slide URL
              </button>
            </div>
          </div>

          <div className="border-t border-white/[0.04] pt-5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-3">Auction Nights Card</h3>
            <ImageUploadField
              label="Auction Nights Image"
              hint="Static image displayed on the top right card"
              prefix="homepage/auction-nights"
              currentUrl={content.performance?.auctionNightsImage || null}
              onUploaded={(url) => setContent({
                ...content,
                performance: {
                  championshipSlides: content.performance?.championshipSlides || [],
                  auctionNightsImage: url,
                },
              })}
              onUploadedComplete={async () => {}}
              onClear={async () => setContent({
                ...content,
                performance: {
                  championshipSlides: content.performance?.championshipSlides || [],
                  auctionNightsImage: "",
                },
              })}
            />
          </div>
        </div>
      </section>

      {/* Specs Ribbon */}
      <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0c1424]/20 p-6 shadow-lg backdrop-blur-sm">
        <div className="border-b border-white/[0.04] pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">Stats / Specs Ribbon</h2>
          <p className="mt-1 text-[10px] text-emerald-400/80"><span className="font-semibold text-emerald-400/90 uppercase tracking-wide">Appears on:</span> Homepage specs strip below hero</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(content.specs ?? DEFAULT_SPECS).map((spec, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="space-y-1">
                <label className={labelClass}>Label</label>
                <input className={inputClass} value={spec.label} onChange={(e) => updateSpec(i, "label", e.target.value)} placeholder="Active Members" />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Value</label>
                <input className={inputClass} value={spec.value} onChange={(e) => updateSpec(i, "value", e.target.value)} placeholder="500+" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0c1424]/20 p-6 shadow-lg backdrop-blur-sm">
        <div className="border-b border-white/[0.04] pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">Why Join Section</h2>
          <p className="mt-1 text-[10px] text-emerald-400/80"><span className="font-semibold text-emerald-400/90 uppercase tracking-wide">Appears on:</span> Homepage feature cards</p>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Section Heading</label>
          <input className={inputClass} value={content.features.heading} onChange={(e) => updateFeatureHeading(e.target.value)} placeholder="WHY JOIN NTG?" />
        </div>
        <div className="space-y-3">
          {content.features.items.map((item, i) => (
            <div key={i} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Feature {i + 1}</p>
              <div className="space-y-1">
                <label className={labelClass}>Title</label>
                <input className={inputClass} value={item.title} onChange={(e) => updateFeatureItem(i, "title", e.target.value)} placeholder="Feature title" />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${inputClass} min-h-[3rem] resize-y`}
                  value={item.description}
                  onChange={(e) => updateFeatureItem(i, "description", e.target.value)}
                  placeholder="Feature description"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hours */}
      <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0c1424]/20 p-6 shadow-lg backdrop-blur-sm">
        <div className="border-b border-white/[0.04] pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">Opening Hours</h2>
          <p className="mt-1 text-[10px] text-emerald-400/80"><span className="font-semibold text-emerald-400/90 uppercase tracking-wide">Appears on:</span> Homepage footer strip</p>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Hours Text</label>
          <input
            className={inputClass}
            value={content.hours}
            onChange={(e) => setContent({ ...content, hours: e.target.value })}
            placeholder="Mon–Fri: 9 AM – 9 PM | Sat–Sun: 10 AM – 8 PM"
          />
        </div>
      </section>

      {/* Bottom save */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all"
        >
          {saving ? "Saving…" : "Save all changes"}
        </button>
      </div>
    </div>
  );
}
