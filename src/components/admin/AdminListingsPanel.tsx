"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminSection } from "@/components/admin/AdminSection";
import { useAdminDeleteConfirm } from "@/components/admin/useAdminDeleteConfirm";
import { LISTING_TRYOUT_GAME_PRESETS } from "@/lib/roster-games";
import type { AdminListingRow } from "@roster-listings/index";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  DRAFT: "border-white/15 bg-white/[0.04] text-white/55",
  CLOSED: "border-rose-500/25 bg-rose-500/10 text-rose-200",
};

type Props = {
  initialListings: AdminListingRow[];
};

export default function AdminListingsPanel({ initialListings }: Props) {
  const router = useRouter();
  const { openDeleteConfirm, DeleteConfirmDialog } = useAdminDeleteConfirm();
  const [listings, setListings] = useState(initialListings);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(listings.length === 0);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"JOB" | "ROSTER_TRYOUT">("JOB");
  const [description, setDescription] = useState("");
  const [gameKey, setGameKey] = useState("valorant");
  const [status, setStatus] = useState<"DRAFT" | "OPEN" | "CLOSED">("DRAFT");

  const takenTryoutGameKeys = useMemo(
    () =>
      new Set(
        listings
          .filter((l) => l.type === "ROSTER_TRYOUT" && l.gameKey)
          .map((l) => l.gameKey!.toLowerCase()),
      ),
    [listings],
  );

  const availableTryoutGames = useMemo(
    () => LISTING_TRYOUT_GAME_PRESETS.filter((g) => !takenTryoutGameKeys.has(g.key)),
    [takenTryoutGameKeys],
  );

  useEffect(() => {
    if (type !== "ROSTER_TRYOUT") return;
    if (availableTryoutGames.length === 0) return;
    if (!availableTryoutGames.some((g) => g.key === gameKey)) {
      setGameKey(availableTryoutGames[0].key);
    }
  }, [type, availableTryoutGames, gameKey]);

  async function refresh() {
    const res = await fetch("/api/admin/listings");
    const data = await res.json();
    if (data.listings) setListings(data.listings);
    router.refresh();
  }

  async function createListing() {
    if (!title.trim() || loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          description: description.trim() || undefined,
          gameKey: type === "ROSTER_TRYOUT" ? gameKey : undefined,
          gameLabel:
            type === "ROSTER_TRYOUT"
              ? LISTING_TRYOUT_GAME_PRESETS.find((g) => g.key === gameKey)?.label
              : undefined,
          status,
        }),
      });

      let data: { error?: string; slug?: string } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Unexpected server response. Refresh the page to check if the listing was created.");
      }

      if (!res.ok) {
        setMessage(data.error ?? "Create failed.");
        return;
      }

      setTitle("");
      setDescription("");
      setStatus("DRAFT");
      setShowCreate(false);

      const listRes = await fetch("/api/admin/listings");
      const listData = await listRes.json();
      if (listData.listings) setListings(listData.listings);

      if (data.slug) {
        window.location.assign(`/admin/listings/${data.slug}`);
        return;
      }

      setMessage("Listing created.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong. Try again.");
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(slug: string, next: "DRAFT" | "OPEN" | "CLOSED") {
    setLoading(true);
    const res = await fetch(`/api/admin/listings/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(false);
    if (res.ok) await refresh();
  }

  function deleteListing(slug: string, title: string) {
    openDeleteConfirm({
      title: `Delete "${title}"?`,
      description:
        "This permanently removes the listing and every application submitted to it. This cannot be undone.",
      confirmLabel: "Delete listing",
      onConfirm: async () => {
        setLoading(true);
        const res = await fetch(`/api/admin/listings/${slug}`, { method: "DELETE" });
        setLoading(false);
        if (res.ok) await refresh();
      },
    });
  }

  return (
    <div className="space-y-6">
      {DeleteConfirmDialog}
      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
          {message}
        </p>
      ) : null}

      <AdminSection
        title="Listings"
        showsOn="Public /listings board + homepage teaser"
        viewHref="/listings"
        viewLabel="View board"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/45">
            {listings.length} listing{listings.length === 1 ? "" : "s"}
            {listings.filter((l) => l.status === "OPEN").length > 0
              ? ` · ${listings.filter((l) => l.status === "OPEN").length} open`
              : ""}
          </p>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/15 transition-colors"
          >
            {showCreate ? "Hide form" : "+ New listing"}
          </button>
        </div>

        {showCreate ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Create listing</p>

            <div className="flex flex-wrap gap-2">
              {(["JOB", "ROSTER_TRYOUT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    type === t
                      ? "border-[var(--color-brand)]/40 bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                      : "border-white/10 text-white/45 hover:border-white/20"
                  }`}
                >
                  {t === "JOB" ? "Job" : "Team tryout"}
                </button>
              ))}
            </div>

            <input
              className={inputClass}
              placeholder="Listing title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className={inputClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="DRAFT" className="bg-[#0a1020]">Draft (hidden)</option>
                <option value="OPEN" className="bg-[#0a1020]">Open (live)</option>
                <option value="CLOSED" className="bg-[#0a1020]">Closed</option>
              </select>
              {type === "ROSTER_TRYOUT" ? (
                availableTryoutGames.length > 0 ? (
                  <select className={inputClass} value={gameKey} onChange={(e) => setGameKey(e.target.value)}>
                    {availableTryoutGames.map((g) => (
                      <option key={g.key} value={g.key} className="bg-[#0a1020]">
                        {g.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="flex items-center rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200/90">
                    Valorant and CS2 already have tryout listings.
                  </p>
                )
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>

            <textarea
              className={`${inputClass} min-h-[7rem]`}
              placeholder="Description: requirements, schedule, what applicants should know…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <button
              type="button"
              onClick={createListing}
              disabled={
                loading ||
                !title.trim() ||
                (type === "ROSTER_TRYOUT" && availableTryoutGames.length === 0)
              }
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Publish listing"}
            </button>
          </div>
        ) : null}

        {listings.length === 0 ? (
          <p className="text-sm text-white/35">No listings yet. Create one above.</p>
        ) : (
          <ul className="space-y-2">
            {listings.map((l) => (
              <li
                key={l.id}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/10 hover:bg-white/[0.03]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/listings/${l.slug}`}
                        className="truncate text-sm font-medium text-white/90 hover:text-amber-200"
                      >
                        {l.title}
                      </Link>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[l.status] ?? STATUS_STYLES.DRAFT}`}
                      >
                        {l.status}
                      </span>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                        {l.type === "JOB" ? "Job" : "Tryout"}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/35">
                      {l.applicationCount} application{l.applicationCount === 1 ? "" : "s"}
                      {l.gameLabel ? ` · ${l.gameLabel}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/listings/${l.slug}`}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/60 hover:border-white/20 hover:text-white/85"
                    >
                      Manage
                    </Link>
                    {l.status !== "OPEN" ? (
                      <button
                        type="button"
                        onClick={() => updateStatus(l.slug, "OPEN")}
                        disabled={loading}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/15"
                      >
                        Open
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateStatus(l.slug, "CLOSED")}
                        disabled={loading}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/50 hover:text-white/75"
                      >
                        Close
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteListing(l.slug, l.title)}
                      disabled={loading}
                      className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-rose-300 hover:text-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
