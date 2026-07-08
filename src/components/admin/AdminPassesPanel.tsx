"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminSection } from "@/components/admin/AdminSection";
import { useAdminDeleteConfirm } from "@/components/admin/useAdminDeleteConfirm";
import type { GamepassPlanView } from "@lounge-commerce/domain/types";
import { MAX_FEATURED_PER_CATEGORY } from "@lounge-commerce/domain/types";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/30 transition-all duration-200";

const emptyForm = {
  id: "",
  slug: "",
  category: "PLAYSTATION" as "PLAYSTATION" | "PC",
  title: "",
  subtitle: "",
  description: "",
  priceDay: "",
  priceNight: "",
  priceSingle: "",
  priceController: "",
  validityText: "",
  timeWindowText: "",
  badge: "",
  featuredOnHome: false,
  inquiryOnly: false,
  sortOrder: "0",
  active: true,
  whatsappMessage: "",
};

type FormState = typeof emptyForm;

function planToForm(plan: GamepassPlanView): FormState {
  return {
    id: plan.id,
    slug: plan.slug,
    category: plan.category,
    title: plan.title,
    subtitle: plan.subtitle ?? "",
    description: plan.description ?? "",
    priceDay: plan.priceDay != null ? String(plan.priceDay) : "",
    priceNight: plan.priceNight != null ? String(plan.priceNight) : "",
    priceSingle: plan.priceSingle != null ? String(plan.priceSingle) : "",
    priceController: plan.priceController != null ? String(plan.priceController) : "",
    validityText: plan.validityText ?? "",
    timeWindowText: plan.timeWindowText ?? "",
    badge: plan.badge ?? "",
    featuredOnHome: plan.featuredOnHome,
    inquiryOnly: plan.inquiryOnly,
    sortOrder: String(plan.sortOrder),
    active: plan.active,
    whatsappMessage: plan.whatsappMessage ?? "",
  };
}

export default function AdminPassesPanel({ initialPlans }: { initialPlans: GamepassPlanView[] }) {
  const router = useRouter();
  const { openDeleteConfirm, DeleteConfirmDialog } = useAdminDeleteConfirm();
  const [plans, setPlans] = useState(initialPlans);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);

  const featuredCount = useMemo(
    () =>
      plans.filter((p) => p.category === form.category && p.featuredOnHome && p.active).length,
    [plans, form.category],
  );

  function selectPlan(plan: GamepassPlanView) {
    setForm(planToForm(plan));
    setMessage(null);
  }

  function resetForm() {
    setForm(emptyForm);
    setMessage(null);
  }

  async function savePlan() {
    setMessage(null);
    if (!form.slug.trim() || !form.title.trim()) {
      setMessage("Slug and title are required.");
      return;
    }

    const res = await fetch("/api/admin/passes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        id: form.id || undefined,
        sortOrder: Number(form.sortOrder) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed to save plan.");
      return;
    }

    setForm(planToForm(data.plan));
    setPlans((prev) => {
      const idx = prev.findIndex((p) => p.id === data.plan.id);
      if (idx === -1) return [...prev, data.plan];
      const next = [...prev];
      next[idx] = data.plan;
      return next.sort(
        (a, b) =>
          a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
      );
    });
    setMessage("Plan saved.");
    router.refresh();
  }

  function requestDelete() {
    if (!form.id) return;
    openDeleteConfirm({
      title: "Delete plan?",
      description: "This permanently removes the gamepass plan from admin and the homepage.",
      confirmLabel: "Delete plan",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/passes?id=${form.id}`, { method: "DELETE" });
        if (res.ok) {
          setPlans((prev) => prev.filter((p) => p.id !== form.id));
          resetForm();
          router.refresh();
        }
      },
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">Passes</h1>
        <p className="mt-1 text-sm text-white/50">
          Edit PlayStation and PC rates. Up to {MAX_FEATURED_PER_CATEGORY} featured plans per category on the homepage.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <AdminSection
          title="All plans"
          showsOn="Homepage #plans section (when NEXT_PUBLIC_SHOW_PLANS_SECTION=1)"
          viewHref="/?#plans"
          viewLabel="Preview homepage"
        >
          <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => selectPlan(plan)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                  form.id === plan.id
                    ? "border-amber-500/40 bg-amber-500/[0.06]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white">{plan.title}</span>
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {plan.category === "PLAYSTATION" ? "PS" : "PC"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-white/45">{plan.slug}</p>
                {plan.featuredOnHome ? (
                  <span className="mt-1 inline-block text-[10px] font-medium uppercase tracking-wider text-amber-400">
                    Featured on home
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="text-xs font-medium uppercase tracking-wider text-amber-500 hover:text-amber-400"
          >
            + New plan
          </button>
        </AdminSection>

        <AdminSection title="Edit plan" showsOn="Selected plan card on homepage">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Slug</span>
              <input
                className={inputClass}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="ps-1-hour"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Category</span>
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as "PLAYSTATION" | "PC" })
                }
              >
                <option value="PLAYSTATION">PlayStation</option>
                <option value="PC">PC</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Sort order</span>
              <input
                className={inputClass}
                type="number"
                value={form.sortOrder}
                onChange={(e) => {
                  const val = e.target.value;
                  const cleaned = (val.length > 1 && val.startsWith("0")) ? val.replace(/^0+/, "") : val;
                  setForm({ ...form, sortOrder: cleaned });
                }}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Title</span>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Subtitle</span>
              <input
                className={inputClass}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Description</span>
              <textarea
                className={`${inputClass} min-h-[72px]`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Day price (INR)</span>
              <input
                className={inputClass}
                type="number"
                value={form.priceDay}
                onChange={(e) => {
                  const val = e.target.value;
                  const cleaned = (val.length > 1 && val.startsWith("0")) ? val.replace(/^0+/, "") : val;
                  setForm({ ...form, priceDay: cleaned });
                }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Night price (INR)</span>
              <input
                className={inputClass}
                type="number"
                value={form.priceNight}
                onChange={(e) => {
                  const val = e.target.value;
                  const cleaned = (val.length > 1 && val.startsWith("0")) ? val.replace(/^0+/, "") : val;
                  setForm({ ...form, priceNight: cleaned });
                }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Single price (INR)</span>
              <input
                className={inputClass}
                type="number"
                value={form.priceSingle}
                onChange={(e) => {
                  const val = e.target.value;
                  const cleaned = (val.length > 1 && val.startsWith("0")) ? val.replace(/^0+/, "") : val;
                  setForm({ ...form, priceSingle: cleaned });
                }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Controller / hr (INR)</span>
              <input
                className={inputClass}
                type="number"
                value={form.priceController}
                onChange={(e) => {
                  const val = e.target.value;
                  const cleaned = (val.length > 1 && val.startsWith("0")) ? val.replace(/^0+/, "") : val;
                  setForm({ ...form, priceController: cleaned });
                }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Validity</span>
              <input
                className={inputClass}
                value={form.validityText}
                onChange={(e) => setForm({ ...form, validityText: e.target.value })}
                placeholder="1 day"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Time window</span>
              <input
                className={inputClass}
                value={form.timeWindowText}
                onChange={(e) => setForm({ ...form, timeWindowText: e.target.value })}
                placeholder="10:00 AM – 3:00 PM"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">Badge</span>
              <input
                className={inputClass}
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                placeholder="Popular"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">WhatsApp message</span>
              <textarea
                className={`${inputClass} min-h-[60px]`}
                value={form.whatsappMessage}
                onChange={(e) => setForm({ ...form, whatsappMessage: e.target.value })}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.featuredOnHome}
                onChange={(e) => setForm({ ...form, featuredOnHome: e.target.checked })}
              />
              Featured on homepage
              {form.featuredOnHome ? (
                <span className="text-[10px] text-white/40">
                  ({featuredCount}/{MAX_FEATURED_PER_CATEGORY} in {form.category})
                </span>
              ) : null}
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.inquiryOnly}
                onChange={(e) => setForm({ ...form, inquiryOnly: e.target.checked })}
              />
              Inquiry only (no price shown)
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active
            </label>
          </div>

          {message ? <p className="text-sm text-amber-300">{message}</p> : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={savePlan}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-amber-400"
            >
              Save plan
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={requestDelete}
                className="rounded-xl border border-red-500/30 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-400 hover:bg-red-500/10"
              >
                Delete
              </button>
            ) : null}
          </div>
        </AdminSection>
      </div>

      {DeleteConfirmDialog}
    </div>
  );
}
