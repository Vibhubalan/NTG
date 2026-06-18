"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { AdminSection } from "@/components/admin/AdminSection";
import { useAdminDeleteConfirm } from "@/components/admin/useAdminDeleteConfirm";

type Deck = {
  id: string;
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  displayMode: string;
  active: boolean;
  images: { id: string; url: string; alt: string; caption: string | null }[];
};

type Reel = {
  id: string;
  reelUrl: string;
  coverUrl: string | null;
  caption: string | null;
  active: boolean;
  sortOrder: number;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/30 transition-all duration-200";

export default function AdminMomentsPanel({
  initialDecks,
  initialReels,
}: {
  initialDecks: Deck[];
  initialReels: Reel[];
}) {
  const router = useRouter();
  const { openDeleteConfirm, DeleteConfirmDialog } = useAdminDeleteConfirm();
  const [activePanelTab, setActivePanelTab] = useState<"collage" | "reels">("collage");
  const [deckForm, setDeckForm] = useState({
    slug: "featured",
    eyebrow: "Featured",
    title: "",
    subtitle: "",
    displayMode: "BLEND" as "BLEND" | "CAROUSEL",
  });
  const [activeDeckId, setActiveDeckId] = useState<string | null>(initialDecks[0]?.id ?? null);
  const [reelForm, setReelForm] = useState({ reelUrl: "", caption: "", coverUrl: "" });
  const [message, setMessage] = useState<string | null>(null);

  const activeDeck = initialDecks.find((d) => d.id === activeDeckId) ?? initialDecks[0];

  // Sync state with activeDeck metadata
  useState(() => {
    if (activeDeck) {
      setDeckForm({
        slug: activeDeck.slug || "featured",
        eyebrow: activeDeck.eyebrow || "Featured",
        title: activeDeck.title || "",
        subtitle: activeDeck.subtitle || "",
        displayMode: (activeDeck.displayMode as "BLEND" | "CAROUSEL") || "BLEND",
      });
    }
  });

  async function saveDeck() {
    setMessage(null);
    const res = await fetch("/api/admin/moments/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: activeDeck?.id,
        ...deckForm,
        active: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed.");
      return;
    }
    setActiveDeckId(data.deck.id);
    setMessage("Collage section metadata saved.");
    router.refresh();
  }

  async function addImage(url: string) {
    if (!activeDeck) {
      setMessage("Please save the collage details first before uploading images.");
      return;
    }
    await fetch("/api/admin/moments/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addImage",
        deckId: activeDeck.id,
        url,
        alt: deckForm.title || "Moment photo",
        caption: "",
      }),
    });
    router.refresh();
  }

  async function removeImage(imageId: string) {
    openDeleteConfirm({
      title: "Delete photo?",
      description: "This permanently removes the photo from the featured collage collage grid.",
      confirmLabel: "Delete photo",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/moments/featured/images/${imageId}`, { method: "DELETE" });
        if (res.ok) {
          router.refresh();
        }
      },
    });
  }

  async function saveReel() {
    if (!reelForm.reelUrl.trim()) return;
    const res = await fetch("/api/admin/moments/reels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reelUrl: reelForm.reelUrl.trim(),
        caption: reelForm.caption.trim(),
        coverUrl: reelForm.coverUrl || undefined,
      }),
    });
    if (res.ok) {
      setReelForm({ reelUrl: "", caption: "", coverUrl: "" });
      setMessage("Reel post added successfully.");
      router.refresh();
    } else {
      const d = await res.json();
      setMessage(d.error ?? "Failed to add reel.");
    }
  }

  function requestDeleteReel(reel: Reel) {
    openDeleteConfirm({
      title: "Delete reel post?",
      description: "This removes the reel from the gallery Recent posts section.",
      confirmLabel: "Delete reel",
      onConfirm: async () => {
        await fetch(`/api/admin/moments/reels?id=${reel.id}`, { method: "DELETE" });
        router.refresh();
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/[0.06] pb-5">
        <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">Moments</h1>
        <p className="mt-1 text-sm text-white/40">Curate homepage featured photo collages and hook up Instagram reels.</p>
      </div>

      {message ? (
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-sm text-white/70 flex items-center justify-between shadow-md">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            {message}
          </span>
          <button type="button" onClick={() => setMessage(null)} className="text-white/40 hover:text-white">✕</button>
        </div>
      ) : null}

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 border-b border-white/[0.06] pb-3">
        <button
          type="button"
          onClick={() => {
            setActivePanelTab("collage");
            setMessage(null);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide border transition-all duration-200 ${
            activePanelTab === "collage"
              ? "bg-amber-500/[0.06] border-amber-500/25 text-amber-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
              : "border-transparent text-white/45 hover:bg-white/[0.02] hover:text-white/80"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Featured Collage</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActivePanelTab("reels");
            setMessage(null);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide border transition-all duration-200 ${
            activePanelTab === "reels"
              ? "bg-amber-500/[0.06] border-amber-500/25 text-amber-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
              : "border-transparent text-white/45 hover:bg-white/[0.02] hover:text-white/80"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" />
          </svg>
          <span>Instagram Reels</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {/* Collage Tab */}
        {activePanelTab === "collage" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Featured photo settings"
              showsOn="Top grid display on /gallery and the Moments cards"
              viewHref="/gallery"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Eyebrow Label</label>
                  <input
                    className={inputClass}
                    value={deckForm.eyebrow}
                    onChange={(e) => setDeckForm({ ...deckForm, eyebrow: e.target.value })}
                    placeholder="e.g. Featured Collage"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Display Format</label>
                  <select
                    className={inputClass}
                    value={deckForm.displayMode}
                    onChange={(e) => setDeckForm({ ...deckForm, displayMode: e.target.value as "BLEND" | "CAROUSEL" })}
                  >
                    <option value="BLEND" className="bg-[#0a1020]">Blend (3 Merged Collage Overlays)</option>
                    <option value="CAROUSEL" className="bg-[#0a1020]">Carousel Slideshow</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Main Collage Title</label>
                  <input
                    className={inputClass}
                    value={deckForm.title}
                    onChange={(e) => setDeckForm({ ...deckForm, title: e.target.value })}
                    placeholder="e.g. Moments at NTG"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Collage Subtitle</label>
                  <input
                    className={inputClass}
                    value={deckForm.subtitle}
                    onChange={(e) => setDeckForm({ ...deckForm, subtitle: e.target.value })}
                    placeholder="e.g. Snaps of competitive action"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={saveDeck}
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors shadow-md"
                >
                  Save Collage Metadata
                </button>
              </div>

              <div className="border-t border-white/[0.04] pt-5 space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">Collage Image List</h3>
                  <p className="text-xs text-white/40 mt-1">Upload photos to add them to the gallery collage pool.</p>
                </div>

                <ImageUploadField
                  label="Add photo to collage"
                  prefix="moments/featured"
                  onUploaded={addImage}
                />

                {activeDeck?.images.length ? (
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 pt-2">
                    {activeDeck.images.map((img) => (
                      <div
                        key={img.id}
                        className="relative group rounded-xl overflow-hidden border border-white/10 shadow-lg"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.alt} className="h-28 w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/35">
                    No images added to this featured collage pool yet.
                  </div>
                )}
              </div>
            </AdminSection>
          </div>
        )}

        {/* Reels Tab */}
        {activePanelTab === "reels" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Add Instagram Reel Post"
              showsOn="Gallery Recent posts scroll bar"
              viewHref="/gallery"
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Reel Share URL Link</label>
                    <input
                      className={inputClass}
                      value={reelForm.reelUrl}
                      onChange={(e) => setReelForm({ ...reelForm, reelUrl: e.target.value })}
                      placeholder="e.g. https://instagram.com/reel/..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Reel Caption</label>
                    <input
                      className={inputClass}
                      value={reelForm.caption}
                      onChange={(e) => setReelForm({ ...reelForm, caption: e.target.value })}
                      placeholder="Caption or description of the video clip"
                    />
                  </div>
                </div>

                <ImageUploadField
                  label="Override Cover Image (Optional)"
                  hint="Custom thumbnail picture. Leave blank to resolve automatically."
                  prefix="reels/covers"
                  currentUrl={reelForm.coverUrl || null}
                  onUploaded={(url) => setReelForm({ ...reelForm, coverUrl: url })}
                />

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={saveReel}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition-colors shadow-md"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Add Reel Post</span>
                  </button>
                </div>
              </div>
            </AdminSection>

            <AdminSection
              title="Active Instagram Reels"
              showsOn="Live index collections on /gallery"
              viewHref="/gallery"
            >
              {initialReels.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/35">
                  No Instagram reels linked yet.
                </div>
              ) : (
                <ul className="grid gap-3">
                  {initialReels.map((reel) => (
                    <li
                      key={reel.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-[#0c1424]/40 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white/90 truncate">{reel.caption ?? "No Caption Provided"}</p>
                        <p className="text-xs text-white/35 truncate mt-0.5">{reel.reelUrl}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => requestDeleteReel(reel)}
                        className="inline-flex items-center gap-1 shrink-0 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </AdminSection>
          </div>
        )}
      </div>

      {DeleteConfirmDialog}
    </div>
  );
}
