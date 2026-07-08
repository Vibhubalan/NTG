"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { AdminSection } from "@/components/admin/AdminSection";
import { useAdminDeleteConfirm } from "@/components/admin/useAdminDeleteConfirm";
import type { HostOfferingView, SponsorLogoView } from "@lounge-commerce/domain/types";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/30 transition-all duration-200";

const OFFERING_TYPES = [
  { type: "SPONSORSHIP", label: "Sponsorship" },
  { type: "BIRTHDAY", label: "Birthday" },
  { type: "PRIVATE_EVENT", label: "Private events" },
] as const;

type OfferingType = (typeof OFFERING_TYPES)[number]["type"];

export default function AdminHostPanel({
  initialOfferings,
  initialSponsorLogos,
}: {
  initialOfferings: HostOfferingView[];
  initialSponsorLogos: SponsorLogoView[];
}) {
  const router = useRouter();
  const { openDeleteConfirm, DeleteConfirmDialog } = useAdminDeleteConfirm();
  const [offerings, setOfferings] = useState(initialOfferings);
  const [sponsorLogos, setSponsorLogos] = useState(initialSponsorLogos);
  const [activeType, setActiveType] = useState<OfferingType>("SPONSORSHIP");
  const [message, setMessage] = useState<string | null>(null);
  const [logoForm, setLogoForm] = useState({
    id: "",
    name: "",
    logoUrl: "",
    websiteUrl: "",
    sortOrder: "0",
    active: true,
  });

  const activeOffering =
    offerings.find((o) => o.type === activeType) ?? {
      id: "",
      type: activeType,
      title: "",
      summary: "",
      body: null,
      highlights: [] as string[],
      active: true,
    };

  const [offeringForm, setOfferingForm] = useState({
    title: activeOffering.title,
    summary: activeOffering.summary,
    body: activeOffering.body ?? "",
    highlightsText: activeOffering.highlights.join("\n"),
    active: activeOffering.active,
  });

  function selectOfferingType(type: OfferingType) {
    setActiveType(type);
    const offering = offerings.find((o) => o.type === type);
    setOfferingForm({
      title: offering?.title ?? "",
      summary: offering?.summary ?? "",
      body: offering?.body ?? "",
      highlightsText: offering?.highlights.join("\n") ?? "",
      active: offering?.active ?? true,
    });
    setMessage(null);
  }

  async function saveOffering() {
    setMessage(null);
    const res = await fetch("/api/admin/host", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: activeType,
        title: offeringForm.title,
        summary: offeringForm.summary,
        body: offeringForm.body,
        highlights: offeringForm.highlightsText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        active: offeringForm.active,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed to save offering.");
      return;
    }

    setOfferings((prev) => {
      const idx = prev.findIndex((o) => o.type === data.offering.type);
      if (idx === -1) return [...prev, data.offering];
      const next = [...prev];
      next[idx] = data.offering;
      return next;
    });
    setMessage("Host offering saved.");
    router.refresh();
  }

  async function saveLogo() {
    if (!logoForm.name.trim() || !logoForm.logoUrl.trim()) {
      setMessage("Logo name and image are required.");
      return;
    }

    const res = await fetch("/api/admin/host", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sponsorLogo",
        id: logoForm.id || undefined,
        name: logoForm.name,
        logoUrl: logoForm.logoUrl,
        websiteUrl: logoForm.websiteUrl || null,
        sortOrder: Number(logoForm.sortOrder) || 0,
        active: logoForm.active,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed to save logo.");
      return;
    }

    setSponsorLogos((prev) => {
      const idx = prev.findIndex((l) => l.id === data.logo.id);
      if (idx === -1) return [...prev, data.logo].sort((a, b) => a.sortOrder - b.sortOrder);
      const next = [...prev];
      next[idx] = data.logo;
      return next.sort((a, b) => a.sortOrder - b.sortOrder);
    });
    setLogoForm({ id: "", name: "", logoUrl: "", websiteUrl: "", sortOrder: "0", active: true });
    setMessage("Sponsor logo saved.");
    router.refresh();
  }

  function editLogo(logo: SponsorLogoView) {
    setLogoForm({
      id: logo.id,
      name: logo.name,
      logoUrl: logo.logoUrl,
      websiteUrl: logo.websiteUrl ?? "",
      sortOrder: String(logo.sortOrder),
      active: logo.active,
    });
  }

  function requestDeleteLogo(id: string) {
    openDeleteConfirm({
      title: "Delete sponsor logo?",
      description: "This removes the logo from the homepage strip and sponsor page.",
      confirmLabel: "Delete logo",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/host?id=${id}`, { method: "DELETE" });
        if (res.ok) {
          setSponsorLogos((prev) => prev.filter((l) => l.id !== id));
          if (logoForm.id === id) {
            setLogoForm({ id: "", name: "", logoUrl: "", websiteUrl: "", sortOrder: "0", active: true });
          }
          router.refresh();
        }
      },
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">Host</h1>
        <p className="mt-1 text-sm text-white/50">
          Edit sponsorship, birthday, and private event copy plus sponsor logos.
        </p>
      </div>

      <AdminSection
        title="Host offerings"
        showsOn="Homepage #plans host row and /host detail page"
        viewHref="/host?topic=sponsor"
        viewLabel="Preview host page"
      >
        <div className="flex flex-wrap gap-2">
          {OFFERING_TYPES.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => selectOfferingType(item.type)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                activeType === item.type
                  ? "bg-amber-500 text-black"
                  : "border border-white/15 text-white/60 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          <label className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Title</span>
            <input
              className={inputClass}
              value={offeringForm.title}
              onChange={(e) => setOfferingForm({ ...offeringForm, title: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Summary</span>
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={offeringForm.summary}
              onChange={(e) => setOfferingForm({ ...offeringForm, summary: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Body</span>
            <textarea
              className={`${inputClass} min-h-[100px]`}
              value={offeringForm.body}
              onChange={(e) => setOfferingForm({ ...offeringForm, body: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">
              Highlights (one per line)
            </span>
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={offeringForm.highlightsText}
              onChange={(e) => setOfferingForm({ ...offeringForm, highlightsText: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={offeringForm.active}
              onChange={(e) => setOfferingForm({ ...offeringForm, active: e.target.checked })}
            />
            Active
          </label>
        </div>

        <button
          type="button"
          onClick={saveOffering}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-amber-400"
        >
          Save offering
        </button>
      </AdminSection>

      <AdminSection title="Sponsor logos" showsOn="Homepage sponsor card strip and /host?topic=sponsor">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Name</span>
            <input
              className={inputClass}
              value={logoForm.name}
              onChange={(e) => setLogoForm({ ...logoForm, name: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Website URL</span>
            <input
              className={inputClass}
              value={logoForm.websiteUrl}
              onChange={(e) => setLogoForm({ ...logoForm, websiteUrl: e.target.value })}
              placeholder="https://"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Sort order</span>
            <input
              className={inputClass}
              type="number"
              value={logoForm.sortOrder}
              onChange={(e) => {
                const val = e.target.value;
                const cleaned = (val.length > 1 && val.startsWith("0")) ? val.replace(/^0+/, "") : val;
                setLogoForm({ ...logoForm, sortOrder: cleaned });
              }}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70 sm:mt-6">
            <input
              type="checkbox"
              checked={logoForm.active}
              onChange={(e) => setLogoForm({ ...logoForm, active: e.target.checked })}
            />
            Active
          </label>
        </div>

        <ImageUploadField
          label="Logo image"
          currentUrl={logoForm.logoUrl || null}
          onUploaded={(url) => setLogoForm({ ...logoForm, logoUrl: url })}
          prefix="sponsors"
        />

        <button
          type="button"
          onClick={saveLogo}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-amber-400"
        >
          {logoForm.id ? "Update logo" : "Add logo"}
        </button>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sponsorLogos.map((logo) => (
            <div
              key={logo.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/5">
                <Image src={logo.logoUrl} alt={logo.name} fill className="object-contain p-1" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{logo.name}</p>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => editLogo(logo)}
                    className="text-[10px] font-semibold uppercase tracking-wider text-amber-500"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDeleteLogo(logo.id)}
                    className="text-[10px] font-semibold uppercase tracking-wider text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AdminSection>

      {message ? <p className="text-sm text-amber-300">{message}</p> : null}
      {DeleteConfirmDialog}
    </div>
  );
}
