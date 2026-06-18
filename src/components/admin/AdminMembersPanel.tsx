"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateOfBirthDisplay } from "@/lib/date-age";
import { useAdminDeleteConfirm } from "@/components/admin/useAdminDeleteConfirm";

type Member = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  age: number | null;
  olympusId: string | null;
  role: string;
  riotId: string | null;
  steamId64: string | null;
  steamPersonaName: string | null;
  displayName: string | null;
  signupCompleted: boolean;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/30 transition-all duration-200";

export default function AdminMembersPanel({ initialMembers }: { initialMembers: Member[] }) {
  const router = useRouter();
  const { openDeleteConfirm, DeleteConfirmDialog } = useAdminDeleteConfirm();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [riotId, setRiotId] = useState("");
  const [steamUrl, setSteamUrl] = useState("");
  const [createForm, setCreateForm] = useState({ email: "", password: "", displayName: "" });
  const [message, setMessage] = useState<string | null>(null);

  const filtered = initialMembers.filter((m) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      m.email?.toLowerCase().includes(q) ||
      m.name?.toLowerCase().includes(q) ||
      m.displayName?.toLowerCase().includes(q) ||
      m.olympusId?.toLowerCase().includes(q) ||
      m.riotId?.toLowerCase().includes(q)
    );
  });

  async function patchMember(id: string, body: Record<string, unknown>) {
    setMessage(null);
    const res = await fetch(`/api/admin/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Update failed.");
      return false;
    }
    // Update local state to match DB changes instantly
    if (selected && selected.id === id) {
      const updated = { ...selected, ...body } as Member;
      // Handle special actions locally
      if (body.riotId !== undefined) updated.riotId = body.riotId as string;
      if (body.action === "unlinkRiot") updated.riotId = null;
      if (body.action === "linkSteam") {
        updated.steamId64 = body.steamUrl as string;
        updated.steamPersonaName = "Loading...";
      }
      if (body.action === "unlinkSteam") {
        updated.steamId64 = null;
        updated.steamPersonaName = null;
      }
      setSelected(updated);
    }
    router.refresh();
    return true;
  }

  async function createMember(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Create failed.");
      return;
    }
    setCreateForm({ email: "", password: "", displayName: "" });
    setMessage("Member account created successfully.");
    setIsCreating(false);
    router.refresh();
  }

  function requestDeleteMember(member: Member) {
    openDeleteConfirm({
      title: "Delete member?",
      description: `This permanently removes ${member.displayName ?? member.email ?? "this account"} and cannot be undone.`,
      onConfirm: async () => {
        const res = await fetch(`/api/admin/members/${member.id}`, { method: "DELETE" });
        if (res.ok) {
          setSelected(null);
          router.refresh();
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-5 gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-white/40">Manage accounts, membership details, and linked game IDs.</p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setIsCreating(true);
              setMessage(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition-colors shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>New Member</span>
          </button>
        </div>
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

      {/* CRM Split Screen Layout */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] items-start">
        {/* Left Column: Search & List */}
        <div className="space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-3.5 text-white/30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              autoComplete="off"
              className={`${inputClass} pl-10`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, username, or Olympus ID..."
            />
          </div>

          <ul className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
                No members found.
              </div>
            ) : (
              filtered.map((m) => {
                const active = selected?.id === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(m);
                        setRiotId(m.riotId ?? "");
                        setSteamUrl("");
                        setNewPassword("");
                        setIsCreating(false);
                        setMessage(null);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                        active
                          ? "bg-amber-500/[0.06] border-amber-500/25 text-white"
                          : "border-white/[0.06] bg-[#0c1424]/30 text-white/80 hover:border-amber-500/10 hover:bg-white/[0.01]"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{m.displayName ?? m.name ?? m.email}</p>
                        <p className="text-xs text-white/40 truncate mt-0.5">
                          {m.displayName ? (
                            <span className="text-[var(--color-brand)]/80">@{m.displayName}</span>
                          ) : (
                            m.email
                          )}
                          {m.age !== null ? ` · Age ${m.age}` : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {m.role === "ADMIN" ? (
                          <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                            Admin
                          </span>
                        ) : (
                          <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/40">
                            Player
                          </span>
                        )}
                        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${active ? "translate-x-0.5 text-amber-400" : "text-white/20"}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Right Column: Creation Form or Details Editor */}
        <div className="sticky top-4">
          {/* Option A: Creation Form */}
          {isCreating && (
            <form
              onSubmit={createMember}
              className="space-y-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] p-5 shadow-xl animate-in fade-in slide-in-from-right-3 duration-200"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">Create Account</h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Email Address</label>
                <input
                  className={inputClass}
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="name@example.com"
                  required
                  type="email"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Temporary Password</label>
                <input
                  className={inputClass}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  required
                  type="password"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Display Username</label>
                <input
                  className={inputClass}
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                  placeholder="e.g. viper_main"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition-colors"
              >
                Create Account
              </button>
            </form>
          )}

          {/* Option B: Member Details / Editor */}
          {selected && !isCreating && (
            <div className="space-y-5 rounded-2xl border border-white/[0.06] bg-[#0c1424]/30 p-5 shadow-xl animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="font-bold text-white text-base">{selected.displayName ?? "No Name Set"}</h3>
                  <p className="text-xs text-white/45 truncate mt-0.5">{selected.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Membership details */}
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Membership details</p>
                <dl className="grid gap-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/40">Username</dt>
                    <dd className="font-semibold text-[var(--color-brand)]/90">
                      {selected.displayName ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/40">Date of birth</dt>
                    <dd className="text-white/75">
                      {selected.dateOfBirth
                        ? formatDateOfBirthDisplay(selected.dateOfBirth) ?? selected.dateOfBirth
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/40">Age</dt>
                    <dd className="text-white/75">{selected.age !== null ? selected.age : "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/40">Olympus ID</dt>
                    <dd className="text-white/75 truncate max-w-[55%] text-right">
                      {selected.olympusId ?? "—"}
                    </dd>
                  </div>
                  {selected.phone ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/40">Phone</dt>
                      <dd className="text-white/75">{selected.phone}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              {/* Action 1: Role Change */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">User Role Permissions</label>
                <select
                  className={inputClass}
                  value={selected.role}
                  onChange={async (e) => {
                    const ok = await patchMember(selected.id, { role: e.target.value });
                    if (ok) {
                      setMessage(`Role updated to ${e.target.value}`);
                    }
                  }}
                >
                  <option value="PLAYER" className="bg-[#0a1020]">Player (Standard Access)</option>
                  <option value="ADMIN" className="bg-[#0a1020]">Admin (Full Control Dashboard)</option>
                </select>
              </div>

              {/* Action 2: Password Reset */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Force Password Reset</label>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New secure password"
                    type="password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newPassword.trim()) return;
                      const ok = await patchMember(selected.id, {
                        action: "resetPassword",
                        newPassword: newPassword.trim(),
                      });
                      if (ok) {
                        setNewPassword("");
                        setMessage("Password updated successfully.");
                      }
                    }}
                    className="shrink-0 rounded-xl bg-white/10 hover:bg-white/15 px-4 text-xs font-semibold text-white/80 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Action 3: Link Riot ID */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Link Valorant Riot ID</label>
                {!selected.riotId ? (
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={riotId}
                      onChange={(e) => setRiotId(e.target.value)}
                      placeholder="RiotName#TagLine"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!riotId.trim()) return;
                        const ok = await patchMember(selected.id, {
                          action: "linkRiot",
                          riotId: riotId.trim(),
                        });
                        if (ok) setMessage("Riot ID linked successfully.");
                      }}
                      className="shrink-0 rounded-xl bg-white/10 hover:bg-white/15 px-4 text-xs font-semibold text-white/80 transition-colors"
                    >
                      Link
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <p className="text-xs text-white/70 truncate flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {selected.riotId}
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await patchMember(selected.id, { action: "unlinkRiot" });
                        if (ok) {
                          setRiotId("");
                          setMessage("Riot ID unlinked.");
                        }
                      }}
                      className="shrink-0 rounded-lg bg-rose-500/10 px-3 py-1.5 text-[10px] font-semibold text-rose-300"
                    >
                      Unlink
                    </button>
                  </div>
                )}
              </div>

              {/* Action 4: Link Steam (CS2) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Steam (CS2)</label>
                {!selected.steamId64 ? (
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={steamUrl}
                      onChange={(e) => setSteamUrl(e.target.value)}
                      placeholder="Steam ID or Profile URL"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!steamUrl.trim()) return;
                        const ok = await patchMember(selected.id, {
                          action: "linkSteam",
                          steamUrl: steamUrl.trim(),
                        });
                        if (ok) setMessage("Steam linked successfully.");
                      }}
                      className="shrink-0 rounded-xl bg-white/10 hover:bg-white/15 px-4 text-xs font-semibold text-white/80 transition-colors"
                    >
                      Link
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <p className="text-xs text-white/70 truncate flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {selected.steamPersonaName ?? selected.steamId64}
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await patchMember(selected.id, { action: "unlinkSteam" });
                        if (ok) setMessage("Steam unlinked.");
                      }}
                      className="shrink-0 rounded-lg bg-rose-500/10 px-3 py-1.5 text-[10px] font-semibold text-rose-300"
                    >
                      Unlink
                    </button>
                  </div>
                )}
              </div>

              {/* Delete Action */}
              <div className="border-t border-white/[0.04] pt-4 flex justify-between items-center">
                <span className="text-xs text-white/30">Dangerous Area</span>
                <button
                  type="button"
                  onClick={() => requestDeleteMember(selected)}
                  className="rounded-xl border border-rose-500/20 bg-rose-500/[0.02] px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* Option C: Empty State */}
          {!selected && !isCreating && (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center space-y-3">
              <div className="mx-auto inline-flex items-center justify-center rounded-full bg-white/[0.02] border border-white/[0.04] p-4 text-white/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white/50">No Selection</p>
              <p className="text-xs text-white/30 max-w-xs mx-auto">
                Select an account from the member list to inspect, edit properties, or click "New Member" to generate accounts.
              </p>
            </div>
          )}
        </div>
      </div>

      {DeleteConfirmDialog}
    </div>
  );
}
