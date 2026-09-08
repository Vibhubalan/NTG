"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AdminSection } from "@/components/admin/AdminSection";
import AdminListingFormBuilder from "@/components/admin/AdminListingFormBuilder";
import AdminListingApplicationView from "@/components/admin/AdminListingApplicationView";
import RulebookUploadField from "@/components/admin/RulebookUploadField";
import type { AdminListingApplicationRow } from "@roster-listings/index";
import type { ListingFormFieldView } from "@core/contracts/roster-listings";
import { formatIstDateInput, parseIstDateInput } from "@/lib/ist-date-input";

type Props = {
  slug: string;
  title: string;
  listingType: "JOB" | "ROSTER_TRYOUT";
  gameKey: string | null;
  initialDescription: string | null;
  initialRulebookUrl: string | null;
  initialAutoManageTryout: boolean;
  initialTryoutOpensAt: string | null;
  initialTryoutClosesAt: string | null;
  initialTryoutOpenDays: number | null;
  initialTryoutRepeatDays: number | null;
  initialFormFields: ListingFormFieldView[];
  initialApplications: AdminListingApplicationRow[];
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30";

export default function AdminListingDetailPanel({
  slug,
  title: initialTitle,
  listingType,
  gameKey,
  initialDescription,
  initialRulebookUrl,
  initialAutoManageTryout,
  initialTryoutOpensAt,
  initialTryoutClosesAt,
  initialTryoutOpenDays,
  initialTryoutRepeatDays,
  initialFormFields,
  initialApplications,
}: Props) {
  const router = useRouter();
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [applications, setApplications] = useState(initialApplications);
  const [rulebookUrl, setRulebookUrl] = useState(initialRulebookUrl);
  const [title, setTitle] = useState(initialTitle);
  const [savingTitle, setSavingTitle] = useState(false);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [savingDescription, setSavingDescription] = useState(false);
  const [autoManageTryout, setAutoManageTryout] = useState(initialAutoManageTryout);
  const [tryoutOpensAt, setTryoutOpensAt] = useState(formatIstDateInput(initialTryoutOpensAt));
  const [tryoutClosesAt, setTryoutClosesAt] = useState(formatIstDateInput(initialTryoutClosesAt));
  const [tryoutOpenDays, setTryoutOpenDays] = useState(
    initialTryoutOpenDays != null ? String(initialTryoutOpenDays) : "7",
  );
  const [tryoutRepeatDays, setTryoutRepeatDays] = useState(
    initialTryoutRepeatDays != null ? String(initialTryoutRepeatDays) : "",
  );
  const [useCloseDate, setUseCloseDate] = useState(Boolean(initialTryoutClosesAt));
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    setDescription(initialDescription ?? "");
  }, [initialDescription]);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 420)}px`;
  }, [description]);

  useEffect(() => {
    setAutoManageTryout(initialAutoManageTryout);
    setTryoutOpensAt(formatIstDateInput(initialTryoutOpensAt));
    setTryoutClosesAt(formatIstDateInput(initialTryoutClosesAt));
    setTryoutOpenDays(initialTryoutOpenDays != null ? String(initialTryoutOpenDays) : "7");
    setTryoutRepeatDays(initialTryoutRepeatDays != null ? String(initialTryoutRepeatDays) : "");
    setUseCloseDate(Boolean(initialTryoutClosesAt));
  }, [
    initialAutoManageTryout,
    initialTryoutOpensAt,
    initialTryoutClosesAt,
    initialTryoutOpenDays,
    initialTryoutRepeatDays,
  ]);
  const [tab, setTab] = useState<"settings" | "form" | "applications">(
    listingType === "ROSTER_TRYOUT" ? "settings" : "form",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selected = applications.find((a) => a.id === selectedId) ?? null;
  const isTryout = listingType === "ROSTER_TRYOUT";
  const descriptionDirty = description !== (initialDescription ?? "");
  const titleDirty = title.trim() !== initialTitle.trim();

  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setMessage("Heading cannot be empty.");
      return;
    }
    setSavingTitle(true);
    setMessage(null);
    const res = await fetch(`/api/admin/listings/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    const data = await res.json();
    setSavingTitle(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save heading.");
      return;
    }
    setTitle(trimmed);
    setMessage("Listing heading saved.");
    router.refresh();
  }

  async function saveDescription() {
    setSavingDescription(true);
    setMessage(null);
    const trimmed = description.trim();
    const res = await fetch(`/api/admin/listings/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: trimmed || null }),
    });
    const data = await res.json();
    setSavingDescription(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save description.");
      return;
    }
    setMessage("Description saved.");
    router.refresh();
  }

  async function saveRulebookUrl(next: string | null) {
    const res = await fetch(`/api/admin/listings/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rulebookUrl: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Could not save rulebook.");
      return false;
    }
    setRulebookUrl(next);
    setMessage(next ? "Tryout rulebook saved." : "Tryout rulebook removed.");
    router.refresh();
    return true;
  }

  async function saveTryoutSchedule() {
    setSavingSchedule(true);
    setMessage(null);

    const openDays = tryoutOpenDays.trim() ? Number(tryoutOpenDays) : null;
    const repeatDays = tryoutRepeatDays.trim() ? Number(tryoutRepeatDays) : null;

    const body: Record<string, unknown> = {
      autoManageTryout,
      tryoutOpensAt: tryoutOpensAt ? parseIstDateInput(tryoutOpensAt).toISOString() : null,
      tryoutOpenDays: useCloseDate ? null : openDays,
      tryoutClosesAt:
        useCloseDate && tryoutClosesAt ? parseIstDateInput(tryoutClosesAt).toISOString() : null,
      tryoutRepeatDays: repeatDays,
    };

    const res = await fetch(`/api/admin/listings/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSavingSchedule(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save tryout schedule.");
      return;
    }
    setMessage("Tryout schedule saved.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
          {message}
        </p>
      ) : null}

      <AdminSection title="Listing heading" showsOn="Public listing page, board card, and hero carousel">
        <p className="mb-3 text-sm text-white/45">
          The main title shown on the public listing page and cards. Changing it does not change the
          listing URL (<span className="font-mono text-white/60">/careers/{slug}</span> stays the same).
        </p>
        <input
          className={inputClass}
          placeholder="Listing title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={saveTitle}
            disabled={!titleDirty || savingTitle || !title.trim()}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {savingTitle ? "Saving…" : "Save heading"}
          </button>
          {titleDirty ? <span className="text-xs text-amber-200/70">Unsaved changes</span> : null}
        </div>
      </AdminSection>

      <AdminSection title="Description" showsOn="Public listing page">
        <p className="mb-3 text-sm text-white/45">
          Shown on the public listing page exactly as you type or paste it. Line breaks are preserved.
        </p>
        <textarea
          ref={descriptionRef}
          rows={16}
          className={`${inputClass} min-h-[26rem] resize-y overflow-hidden font-mono text-sm leading-relaxed`}
          placeholder={"Requirements, schedule, what applicants should know…"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={saveDescription}
            disabled={!descriptionDirty || savingDescription}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {savingDescription ? "Saving…" : "Save description"}
          </button>
          {descriptionDirty ? (
            <span className="text-xs text-amber-200/70">Unsaved changes</span>
          ) : null}
        </div>
      </AdminSection>

      <div className="flex gap-2 border-b border-white/[0.08] pb-1">
        {isTryout ? (
          <button
            type="button"
            onClick={() => {
              setTab("settings");
              setSelectedId(null);
            }}
            className={`rounded-t-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
              tab === "settings" ? "bg-white/[0.06] text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            Tryout settings
          </button>
        ) : null}
        {!isTryout ? (
          <button
            type="button"
            onClick={() => {
              setTab("form");
              setSelectedId(null);
            }}
            className={`rounded-t-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
              tab === "form" ? "bg-white/[0.06] text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            Application form
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setTab("applications")}
          className={`rounded-t-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
            tab === "applications"
              ? "bg-white/[0.06] text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Applications ({applications.length})
        </button>
      </div>

      {tab === "settings" && isTryout ? (
        <>
          <AdminSection title="Tryout schedule" showsOn="Public roster page + listing apply window">
            <p className="mb-4 text-sm text-white/45">
              Like tournament registration: set when tryouts open and close. The roster page shows a
              countdown until opening, then an Apply button while live. Leave auto-schedule off to
              control Open/Closed manually from the listings list.
            </p>
            <label className="mb-4 flex cursor-pointer items-center gap-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={autoManageTryout}
                onChange={(e) => setAutoManageTryout(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 accent-amber-500"
              />
              Auto open &amp; close tryouts by date
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Opens on
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={tryoutOpensAt}
                  onChange={(e) => setTryoutOpensAt(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Repeat every (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className={inputClass}
                  placeholder="Optional, e.g. 30 for monthly"
                  value={tryoutRepeatDays}
                  onChange={(e) => setTryoutRepeatDays(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-white/55">
                <input
                  type="radio"
                  name="closeMode"
                  checked={!useCloseDate}
                  onChange={() => setUseCloseDate(false)}
                />
                Stay open for a number of days
              </label>
              {!useCloseDate ? (
                <input
                  type="number"
                  min={1}
                  max={90}
                  className={`${inputClass} max-w-xs`}
                  value={tryoutOpenDays}
                  onChange={(e) => setTryoutOpenDays(e.target.value)}
                />
              ) : null}
              <label className="flex cursor-pointer items-center gap-2 text-xs text-white/55">
                <input
                  type="radio"
                  name="closeMode"
                  checked={useCloseDate}
                  onChange={() => setUseCloseDate(true)}
                />
                Close on a specific date
              </label>
              {useCloseDate ? (
                <input
                  type="date"
                  className={`${inputClass} max-w-xs`}
                  value={tryoutClosesAt}
                  onChange={(e) => setTryoutClosesAt(e.target.value)}
                />
              ) : null}
            </div>
            <button
              type="button"
              onClick={saveTryoutSchedule}
              disabled={savingSchedule}
              className="mt-4 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {savingSchedule ? "Saving…" : "Save tryout schedule"}
            </button>
          </AdminSection>

          <AdminSection title="One-click tryout join" showsOn="Public tryout listing page">
          <p className="mb-4 text-sm text-white/45">
            Players join tryouts with one button. They agree to NTG policy (and your rulebook if
            uploaded). Their linked game profile is snapshotted automatically. No application form to
            fill out.
          </p>
          <RulebookUploadField
            label="Tryout rulebook (optional)"
            prefix={`listings/${slug}/rulebook`}
            currentUrl={rulebookUrl}
            onUploaded={(url) => setRulebookUrl(url)}
            onUploadedComplete={async (url) => {
              await saveRulebookUrl(url);
            }}
            onClear={async () => {
              await saveRulebookUrl(null);
            }}
            hint="Upload a PDF or Word doc. Players must agree to it before joining tryouts."
          />
          </AdminSection>
        </>
      ) : null}

      {tab === "form" && !isTryout ? (
        <AdminSection title="Form builder" showsOn="Public application page">
          <p className="mb-4 text-sm text-white/45">
            Build the application form applicants see: sections, questions, choices, and required fields.
          </p>
          <AdminListingFormBuilder
            slug={slug}
            listingType={listingType}
            initialFields={initialFormFields}
          />
        </AdminSection>
      ) : null}

      {tab === "applications" ? (
        selected ? (
          <AdminListingApplicationView
            application={selected}
            formFields={initialFormFields}
            listingType={listingType}
            listingTitle={title}
            gameKey={gameKey}
            onClose={() => setSelectedId(null)}
            onDeleted={() => {
              setApplications((prev) => prev.filter((a) => a.id !== selected.id));
              setSelectedId(null);
              router.refresh();
            }}
          />
        ) : (
          <AdminSection title={title} showsOn="Listing applications">
            <a
              href={`/api/admin/listings/${slug}/applications?format=csv`}
              className="mb-4 inline-flex rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04]"
            >
              Export CSV
            </a>

            {applications.length === 0 ? (
              <p className="text-sm text-white/35">No applications yet.</p>
            ) : (
              <ul className="space-y-1 max-w-sm">
                {applications.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-sm text-white/80 transition-colors hover:border-white/12 hover:bg-white/[0.04] hover:text-white"
                    >
                      {a.displayName ?? "Unknown"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>
        )
      ) : null}
    </div>
  );
}
