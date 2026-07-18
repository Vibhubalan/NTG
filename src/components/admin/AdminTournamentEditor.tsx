"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import RulebookUploadField from "@/components/admin/RulebookUploadField";
import { AdminSection } from "@/components/admin/AdminSection";
import { useAdminDeleteConfirm } from "@/components/admin/useAdminDeleteConfirm";
import type { PrizeSplitRow } from "@core/contracts";
import { emptyToNull, prizeSplitForSave } from "@/lib/admin-fields";
import { formatParticipantRole } from "@/lib/tournament-display";

type Team = {
  id: string;
  name: string;
  seed: number | null;
  logoUrl?: string | null;
  players: {
    id: string;
    displayName: string;
    riotGameName: string | null;
    riotTagLine: string | null;
    registrationId: string | null;
  }[];
};

type RegistrationRow = {
  id: string;
  createdAt: string;
  participantRole: string;
  teamName: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  olympusId: string | null;
  dateOfBirth: string | null;
  partnerUsername: string | null;
  partnerName: string | null;
  riotId: string | null;
  rankTier: string | null;
  valorantRoles: string | null;
  steamId64: string | null;
  cs2Hours: number | null;
  cs2PeakPremier: string | null;
  cs2FaceitRank: string | null;
  teamId: string | null;
};

type PoolPlayer = {
  id: string;
  displayName: string;
  riotId: string | null;
  steamId64: string | null;
};

type TournamentData = {
  slug: string;
  name: string;
  game: string;
  gameLabel: string | null;
  registrationFormat: string | null;
  format: string | null;
  coCaptainSlots: number;
  startingBudget: number;
  rosterSize: number;
  minBidIncrement: number;
  auctionStartsAt: string | null;
  auctionEndsAt: string | null;
  groupCount: number | null;
  teamsPerGroup: number | null;
  advancePerGroup: number | null;
  rankPoints: { rank: string; floor: number }[] | null;
  seasonId: string | null;
  status: string;
  description: string | null;
  posterUrl: string | null;
  hubBannerUrl: string | null;
  hubCarouselImages: string[];
  showOnEsportsHub: boolean;
  prizePool: string | null;
  prizeNotes: string | null;
  prizeSplit: PrizeSplitRow[] | null;
  startsAt: string | null;
  endsAt: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  autoManageStatus: boolean;
  hideAfter: string | null;
  bracketUrl: string | null;
  rulebookUrl: string | null;
  publicAuction?: boolean;
  tournamentTeams: Team[];
  registrations: RegistrationRow[];
  poolPlayers: PoolPlayer[];
  placements: {
    role: string;
    teamLabel: string | null;
    user: { id: string; name: string } | null;
  }[];
};

function toLocalDatetime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultSplit(total: number): PrizeSplitRow[] {
  return [
    { place: 1, label: "Winner", amount: Math.round(total * 0.6) },
    { place: 2, label: "Runner Up", amount: Math.round(total * 0.3) },
    { place: 3, label: "3rd Place", amount: Math.round(total * 0.1) },
  ];
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/30 transition-all duration-200";

const checkboxLabelClass =
  "flex items-center gap-3 rounded-xl border border-white/[0.05] bg-[#0a1020]/30 px-4 py-3 text-sm text-white/70 hover:bg-white/[0.02] cursor-pointer transition-colors";

const SUPPORTS_FORMAT = ["VALORANT", "CS2"];

const DEFAULT_VALORANT_RANK_POINTS: { rank: string; floor: number }[] = [
  { rank: "Immortal", floor: 12 },
  { rank: "Ascendant", floor: 10 },
  { rank: "Diamond", floor: 8 },
  { rank: "Platinum", floor: 6 },
  { rank: "Gold", floor: 4 },
  { rank: "Silver", floor: 2 },
  { rank: "Bronze", floor: 1 },
  { rank: "Iron", floor: 1 },
];

/** Tier accent dots for the rank-points editor. */
const RANK_DOT: Record<string, string> = {
  Immortal: "#b45e6b",
  Ascendant: "#22c55e",
  Diamond: "#b794f4",
  Platinum: "#5eead4",
  Gold: "#f6c177",
  Silver: "#cbd5e1",
  Bronze: "#b08d57",
  Iron: "#8a8f98",
  Unranked: "#6b7280",
};

type CupFields = Omit<
  TournamentData,
  "slug" | "tournamentTeams" | "registrations" | "poolPlayers" | "placements" | "hideAfter"
>;

function applyCupFields(form: TournamentData, fields: CupFields): TournamentData {
  return { ...form, ...fields };
}

/** Normalized cup fields compared against the last saved state (matches saveAll payload). */
function getSavePayload(form: TournamentData) {
  return {
    name: form.name.trim(),
    game: form.game,
    gameLabel: emptyToNull(form.gameLabel),
    status: form.status,
    hubBannerUrl: emptyToNull(form.hubBannerUrl),
    hubCarouselImages: form.hubCarouselImages,
    showOnEsportsHub: form.showOnEsportsHub,
    prizePool: form.prizePool ? Number(form.prizePool) : null,
    prizeNotes: emptyToNull(form.prizeNotes),
    prizeSplit: prizeSplitForSave(form.prizePool, form.prizeSplit, defaultSplit),
    startsAt: form.startsAt || null,
    endsAt: form.endsAt || null,
    registrationOpensAt: form.registrationOpensAt || null,
    autoManageStatus: form.autoManageStatus,
    bracketUrl: emptyToNull(form.bracketUrl),
    rulebookUrl: emptyToNull(form.rulebookUrl),
    registrationFormat: SUPPORTS_FORMAT.includes(form.game)
      ? (form.registrationFormat ?? "AUCTION")
      : null,
    format: form.format || null,
    coCaptainSlots: form.coCaptainSlots,
    startingBudget: form.startingBudget,
    rosterSize: form.rosterSize,
    minBidIncrement: form.minBidIncrement,
    auctionStartsAt: form.auctionStartsAt || null,
    auctionEndsAt: form.auctionEndsAt || null,
    groupCount: form.groupCount,
    teamsPerGroup: form.teamsPerGroup,
    advancePerGroup: form.advancePerGroup,
    rankPoints: form.rankPoints,
    publicAuction: form.publicAuction ?? false,
  };
}

function savePayloadsEqual(
  a: ReturnType<typeof getSavePayload>,
  b: ReturnType<typeof getSavePayload>,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function readJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text.slice(0, 200) || `Request failed (${res.status})` };
  }
}

export default function AdminTournamentEditor({
  initial,
  seasons,
  auctionHref,
}: {
  initial: TournamentData;
  seasons: { id: string; label: string }[];
  auctionHref?: string | null;
}) {
  const router = useRouter();
  const { openDeleteConfirm, DeleteConfirmDialog } = useAdminDeleteConfirm();

  const initialFormState: TournamentData = useMemo(() => ({ ...initial, seasonId: null }), [initial]);

  const [form, setForm] = useState<TournamentData>(initialFormState);
  const [listVersion, setListVersion] = useState(0);
  const registrations = initial.registrations;
  const tournamentTeams = initial.tournamentTeams;
  const poolPlayers = initial.poolPlayers;
  const [activeTab, setActiveTab] = useState<
    "general" | "auction" | "media" | "prizes" | "standings" | "registrations" | "teams"
  >("general");
  const initialMvpRole = initial.placements.find((p) => p.role === "MVP");
  const initialMvpUser = initialMvpRole?.user;
  
  const [mvpEnabled, setMvpEnabled] = useState(!!initialMvpRole);

  const [mvpSearch, setMvpSearch] = useState(
    initialMvpUser ? initialMvpUser.name : (initialMvpRole?.teamLabel ?? "")
  );
  const [mvpResults, setMvpResults] = useState<
    { id: string; email: string | null; name: string | null; displayName: string | null }[]
  >([]);
  const [selectedMvp, setSelectedMvp] = useState<{ id: string; label: string } | null>(
    initialMvpUser ? { id: initialMvpUser.id, label: initialMvpUser.name } : null
  );

  const savedMvpRef = useRef({
    enabled: !!initialMvpRole,
    userId: initialMvpUser?.id ?? null,
  });

  const savedCupBaselineRef = useRef(getSavePayload(initialFormState));

  const [loading, setLoading] = useState(false);
  const isDirty = useMemo(() => {
    const cupDirty = !savePayloadsEqual(getSavePayload(form), savedCupBaselineRef.current);
    const mvpDirty =
      mvpEnabled !== savedMvpRef.current.enabled ||
      (mvpEnabled && selectedMvp?.id !== savedMvpRef.current.userId);
    return cupDirty || mvpDirty;
  }, [form, mvpEnabled, selectedMvp]);
  const [savedStatus, setSavedStatus] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [newPlayerNames, setNewPlayerNames] = useState<Record<string, string>>({});
  const [poolPick, setPoolPick] = useState<Record<string, string>>({});
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<
    { id: string; email: string | null; name: string | null; displayName: string | null }[]
  >([]);
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [addRole, setAddRole] = useState<"PLAYER" | "CAPTAIN">("PLAYER");
  const [addTeamName, setAddTeamName] = useState("");
  const [addCoCaptainUsernames, setAddCoCaptainUsernames] = useState(["", "", "", ""]);
  const [addMemberUsernames, setAddMemberUsernames] = useState(["", "", "", ""]);
  const [addingMember, setAddingMember] = useState(false);

  const isAuctionFormat =
    SUPPORTS_FORMAT.includes(form.game) &&
    (form.registrationFormat === "AUCTION" || !form.registrationFormat);
  const isStandardFormat =
    SUPPORTS_FORMAT.includes(form.game) && form.registrationFormat === "STANDARD";

  const prizeSplitDisplay =
    form.prizeSplit != null
      ? form.prizeSplit
      : form.prizePool
        ? defaultSplit(Number(form.prizePool))
        : [];

  const cupUrl = `/esports/tournaments/${form.slug}`;
  const hubUrl = "/esports";

  function isRegistrationLiveNow(): boolean {
    if (
      form.autoManageStatus &&
      form.registrationOpensAt &&
      (isAuctionFormat ? form.auctionStartsAt : form.startsAt)
    ) {
      const now = Date.now();
      const opens = new Date(form.registrationOpensAt).getTime();
      const closeAnchor = isAuctionFormat
        ? new Date(form.auctionStartsAt!).getTime()
        : new Date(form.startsAt!).getTime();
      const closes = closeAnchor - 60_000;
      return now >= opens && now < closes;
    }
    return form.status === "REGISTRATION_OPEN";
  }

  useEffect(() => {
    if (listVersion === 0) return;
    const role = initial.placements.find((p) => p.role === "MVP");
    const user = role?.user;
    
    savedMvpRef.current = {
      enabled: !!role,
      userId: user?.id ?? null,
    };
    setMvpEnabled(!!role);
    setSelectedMvp(user ? { id: user.id, label: user.name } : null);
    setMvpSearch(user ? user.name : (role?.teamLabel ?? ""));
  }, [listVersion, initial.placements]);

  function applySavedCupFields(fields: CupFields) {
    setForm((current) => {
      const next = applyCupFields(current, fields);
      savedCupBaselineRef.current = getSavePayload(next);
      return next;
    });
  }

  function refreshLists() {
    setListVersion((v) => v + 1);
    router.refresh();
  }

  const isRegistrationOpen = isRegistrationLiveNow();

  useEffect(() => {
    const q = memberSearch.trim();
    if (q.length < 2) {
      setMemberResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/admin/members?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setMemberResults(data.users);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [memberSearch]);

  useEffect(() => {
    const q = mvpSearch.trim();
    if (q.length < 2) {
      setMvpResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/admin/members?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setMvpResults(data.users);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [mvpSearch]);

  async function addMemberRegistration() {
    if (!selectedMember) return;
    const participantRole = isStandardFormat ? "CAPTAIN" : addRole;
    setAddingMember(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${form.slug}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedMember.id,
          participantRole,
          teamName: participantRole === "CAPTAIN" ? addTeamName.trim() : undefined,
          coCaptainUsernames:
            participantRole === "CAPTAIN" && isAuctionFormat && form.coCaptainSlots > 0
              ? addCoCaptainUsernames.slice(0, form.coCaptainSlots).map((u) => u.trim())
              : undefined,
          memberUsernames:
            participantRole === "CAPTAIN" && isStandardFormat
              ? addMemberUsernames.map((u) => u.trim())
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Could not add member.");
        return;
      }
      setSelectedMember(null);
      setMemberSearch("");
      setMemberResults([]);
      setAddTeamName("");
      setAddCoCaptainUsernames(["", "", "", ""]);
      setAddMemberUsernames(["", "", "", ""]);
      setAddRole("PLAYER");
      setMessage("Member added to cup.");
      refreshLists();
    } finally {
      setAddingMember(false);
    }
  }

  function requestRemoveRegistration(reg: RegistrationRow) {
    const isCaptain = reg.participantRole === "CAPTAIN";
    openDeleteConfirm({
      title: `Remove ${reg.displayName ?? "this member"}?`,
      description: isCaptain
        ? "This captain registration will remove their entire team and all linked registrations for this cup."
        : "This member will be removed from the cup registrations list.",
      confirmLabel: "Remove",
      onConfirm: async () => {
        const res = await fetch(
          `/api/admin/tournaments/${form.slug}/registrations/${reg.id}`,
          { method: "DELETE" },
        );
        if (res.ok) {
          setMessage("Registration removed.");
          refreshLists();
        } else {
          const data = await res.json();
          setMessage(data.error ?? "Remove failed.");
        }
      },
    });
  }

  async function patchField(fields: Record<string, unknown>, successMsg = "Saved.") {
    const res = await fetch(`/api/admin/tournaments/${form.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) {
      setMessage(String(data.error ?? "Save failed."));
      return false;
    }
    if (data.tournament) {
      applySavedCupFields(data.tournament as CupFields);
    }
    setMessage(successMsg);
    return true;
  }

  /** Hub banner doubles as cup detail hero — persist both fields on upload. */
  async function patchCupBannerImage(url: string | null, successMsg: string) {
    const ok = await patchField({ hubBannerUrl: url, posterUrl: url }, successMsg);
    if (ok) router.refresh();
    return ok;
  }

  async function createAuction() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${form.slug}/auction`, { method: "POST" });
      const data = await readJsonResponse(res);
      setMessage(res.ok ? "Auction created." : String(data.error ?? "Failed to create auction."));
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    setLoading(true);
    setMessage(null);

    if (form.autoManageStatus) {
      if (!form.registrationOpensAt || !form.startsAt || !form.endsAt) {
        setMessage("Auto-manage requires registration open, cup start, and cup end dates.");
        setLoading(false);
        return;
      }
      if (isAuctionFormat && (!form.auctionStartsAt || !form.auctionEndsAt)) {
        setMessage("Auction cups require auction start and auction end dates.");
        setLoading(false);
        return;
      }
      const opens = new Date(form.registrationOpensAt).getTime();
      const closeAnchor = isAuctionFormat
        ? new Date(form.auctionStartsAt!).getTime()
        : new Date(form.startsAt).getTime();
      const closes = closeAnchor - 60_000;
      const ends = new Date(form.endsAt).getTime();
      const auctionEnd = isAuctionFormat ? new Date(form.auctionEndsAt!).getTime() : null;
      const starts = new Date(form.startsAt).getTime();
      if (opens >= closes) {
        setMessage(
          isAuctionFormat
            ? "Registration must open before it closes (1 minute before auction starts)."
            : "Registration must open before it closes (1 minute before cup start).",
        );
        setLoading(false);
        return;
      }
      if (isAuctionFormat && auctionEnd !== null) {
        if (closes >= new Date(form.auctionStartsAt!).getTime()) {
          setMessage("Auction must start after registration closes.");
          setLoading(false);
          return;
        }
        if (new Date(form.auctionStartsAt!).getTime() >= auctionEnd) {
          setMessage("Auction end must be after auction start.");
          setLoading(false);
          return;
        }
        if (auctionEnd >= starts) {
          setMessage("Cup start must be after the auction ends.");
          setLoading(false);
          return;
        }
      }
      if (isAuctionFormat ? starts >= ends : closes >= ends) {
        setMessage("Cup end must be after cup start.");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/admin/tournaments/${form.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          game: form.game,
          gameLabel: emptyToNull(form.gameLabel),
          seasonId: null,
          status: form.status,
          description: null,
          posterUrl: emptyToNull(form.hubBannerUrl),
          hubBannerUrl: emptyToNull(form.hubBannerUrl),
          hubCarouselImages: form.hubCarouselImages,
          showOnEsportsHub: form.showOnEsportsHub,
          prizePool: form.prizePool ? Number(form.prizePool) : null,
          prizeNotes: emptyToNull(form.prizeNotes),
          prizeSplit: prizeSplitForSave(form.prizePool, form.prizeSplit, defaultSplit),
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          registrationOpensAt: form.registrationOpensAt || null,
          autoManageStatus: form.autoManageStatus,
          hideAfter: null,
          bracketUrl: emptyToNull(form.bracketUrl),
          rulebookUrl: emptyToNull(form.rulebookUrl),
          registrationFormat: SUPPORTS_FORMAT.includes(form.game) ? (form.registrationFormat ?? "AUCTION") : null,
          format: form.format || null,
          coCaptainSlots: form.coCaptainSlots,
          startingBudget: form.startingBudget,
          rosterSize: form.rosterSize,
          minBidIncrement: form.minBidIncrement,
          auctionStartsAt: form.auctionStartsAt || null,
          auctionEndsAt: form.auctionEndsAt || null,
          groupCount: form.groupCount,
          teamsPerGroup: form.teamsPerGroup,
          advancePerGroup: form.advancePerGroup,
          rankPoints: form.rankPoints,
        }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) {
        setMessage(String(data.error ?? "Save failed."));
        return;
      }

      if (data.tournament) {
        applySavedCupFields(data.tournament as CupFields);
      }

      const mvpChanged =
        mvpEnabled !== savedMvpRef.current.enabled ||
        (mvpEnabled && selectedMvp?.id !== savedMvpRef.current.userId);

      if (mvpChanged) {
        const placements = mvpEnabled && selectedMvp ? [{ role: "MVP" as const, userId: selectedMvp.id }] : [];
        const clearRoles = ["MVP"] as const;

        const pRes = await fetch(`/api/admin/tournaments/${form.slug}/placements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placements, clearRoles }),
        });
        const d = await readJsonResponse(pRes);
        if (!pRes.ok) {
          setMessage(String(d.error ?? "MVP save failed."));
          return;
        }
        savedMvpRef.current = { enabled: mvpEnabled, userId: selectedMvp?.id ?? null };
      }

      setMessage("All changes successfully saved.");
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2500);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function requestDeleteCup() {
    openDeleteConfirm({
      title: `Delete ${form.name}?`,
      description: "This permanently removes the cup, teams, registrations, and results. This cannot be undone.",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/tournaments/${form.slug}`, { method: "DELETE" });
        if (res.ok) {
          router.push("/admin/tournaments");
          router.refresh();
        }
      },
    });
  }

  function requestRemoveTeam(teamId: string, teamName: string) {
    openDeleteConfirm({
      title: `Delete team "${teamName}"?`,
      description:
        "This team and all linked cup registrations (captain, co-captain, and players) will be permanently removed.",
      confirmLabel: "Delete team",
      onConfirm: async () => {
        await fetch(`/api/admin/tournaments/${form.slug}/teams/${teamId}`, { method: "DELETE" });
        refreshLists();
      },
    });
  }

  function requestRemovePlayer(teamId: string, playerId: string, playerName: string) {
    openDeleteConfirm({
      title: `Remove ${playerName}?`,
      description: isAuctionFormat
        ? "This player will be removed from the team and returned to the unassigned player pool."
        : "This player will be removed from the team on the cup page.",
      confirmLabel: "Remove player",
      onConfirm: async () => {
        await fetch(
          `/api/admin/tournaments/${form.slug}/teams/${teamId}/players/${playerId}`,
          { method: "DELETE" },
        );
        refreshLists();
      },
    });
  }

  function requestRemoveRosterMember(team: Team, reg: RegistrationRow) {
    if (reg.participantRole === "CAPTAIN" || reg.participantRole === "CO_CAPTAIN") {
      requestRemoveRegistration(reg);
      return;
    }

    const draftedPlayer = team.players.find((p) => p.registrationId === reg.id);
    if (isAuctionFormat && draftedPlayer) {
      requestRemovePlayer(team.id, draftedPlayer.id, reg.displayName ?? "Player");
      return;
    }

    openDeleteConfirm({
      title: `Remove ${reg.displayName ?? "this player"}?`,
      description: "This player will be removed from the team and their cup registration will be deleted.",
      confirmLabel: "Remove",
      onConfirm: async () => {
        const res = await fetch(
          `/api/admin/tournaments/${form.slug}/registrations/${reg.id}`,
          { method: "DELETE" },
        );
        if (res.ok) {
          setMessage("Player removed.");
          refreshLists();
        } else {
          const data = await res.json();
          setMessage(data.error ?? "Remove failed.");
        }
      },
    });
  }

  function requestRemoveCarouselSlide(url: string) {
    openDeleteConfirm({
      title: "Remove hub slide?",
      description: "This image will no longer rotate on the esports hub registration card.",
      confirmLabel: "Remove slide",
      onConfirm: async () => {
        const next = form.hubCarouselImages.filter((u) => u !== url);
        setForm({ ...form, hubCarouselImages: next });
        await patchField({ hubCarouselImages: next }, "Slide removed.");
      },
    });
  }

  async function addTeam() {
    if (!newTeamName.trim()) return;
    const res = await fetch(`/api/admin/tournaments/${form.slug}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTeamName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewTeamName("");
      refreshLists();
    } else {
      setMessage(data.error ?? "Failed to add team.");
    }
  }

  async function addPlayer(teamId: string) {
    const poolId = poolPick[teamId]?.trim();
    const name = newPlayerNames[teamId]?.trim();

    if (poolId) {
      const res = await fetch(`/api/admin/tournaments/${form.slug}/teams/${teamId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: poolId }),
      });
      if (res.ok) {
        setPoolPick((prev) => ({ ...prev, [teamId]: "" }));
        refreshLists();
      }
      return;
    }

    if (!name) return;
    const res = await fetch(`/api/admin/tournaments/${form.slug}/teams/${teamId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    if (res.ok) {
      setNewPlayerNames((prev) => ({ ...prev, [teamId]: "" }));
      refreshLists();
    }
  }

  function currentSplitRows(): PrizeSplitRow[] {
    if (form.prizeSplit != null) return [...form.prizeSplit];
    if (form.prizePool) return defaultSplit(Number(form.prizePool));
    return [];
  }

  function updateSplit(i: number, field: keyof PrizeSplitRow, value: string) {
    const next = currentSplitRows();
    const row = { ...next[i] };
    if (field === "amount") row.amount = Number(value) || 0;
    else if (field === "place") row.place = Number(value) || 1;
    else row.label = value;
    next[i] = row;
    setForm((f) => ({ ...f, prizeSplit: next }));
  }

  function addSplitRow() {
    const current = currentSplitRows();
    const nextPlace =
      current.length > 0 ? Math.max(...current.map((r) => r.place)) + 1 : 1;
    setForm((f) => ({
      ...f,
      prizeSplit: [
        ...current,
        { place: nextPlace, label: `Place ${nextPlace}`, amount: 0 },
      ],
    }));
  }

  function removeSplitRow(index: number) {
    const next = currentSplitRows();
    next.splice(index, 1);
    const renumbered = next.map((row, i) => ({ ...row, place: i + 1 }));
    setForm((f) => ({ ...f, prizeSplit: renumbered }));
  }

  const editorTabs = [
    {
      id: "general" as const,
      label: "General",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    ...(form.registrationFormat === "AUCTION"
      ? [
          {
            id: "auction" as const,
            label: "Auction",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            ),
          },
        ]
      : []),
    {
      id: "media" as const,
      label: "Media",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "prizes" as const,
      label: "Prizes",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "standings" as const,
      label: "Results & MVP",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a4 4 0 004-4V5H8v6a4 4 0 004 4zM12 15v4m-3 0h6M5 7h3m8 0h3M5 7a2 2 0 012-2m10 4a2 2 0 002-2" />
        </svg>
      ),
    },
    {
      id: "registrations" as const,
      label: "Registrations",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: "teams" as const,
      label: "Teams",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Save Notification alert */}
      {message ? (
        (() => {
          const isError =
            message.toLowerCase().includes("fail") ||
            message.toLowerCase().includes("error") ||
            message.toLowerCase().includes("wrong");
          return (
            <div className={`rounded-xl px-4 py-3 text-sm flex items-center justify-between shadow-md ${
              isError 
                ? "bg-rose-500/10 border border-rose-500/30 text-rose-200" 
                : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
            }`}>
              <span className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${isError ? "bg-rose-400" : "bg-emerald-400"}`} />
                {message}
              </span>
              <button type="button" onClick={() => setMessage(null)} className={isError ? "text-rose-400/50 hover:text-rose-400" : "text-emerald-400/50 hover:text-emerald-400"}>✕</button>
            </div>
          );
        })()
      ) : null}

      {/* Sticky Top Editor Header bar */}
      <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400/90 uppercase tracking-widest">
            <span>Cup Editor</span>
            <span>·</span>
            <span className="text-white/45 font-medium lowercase">/{form.slug}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-white tracking-tight sm:text-3xl">{form.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={cupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04] hover:text-white transition-all"
          >
            View page
          </a>
          {isRegistrationOpen && (
            <a
              href={hubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10 hover:text-white transition-all"
            >
              Esports Hub
            </a>
          )}
          <button
            type="button"
            onClick={requestDeleteCup}
            className="rounded-xl border border-rose-500/20 bg-rose-500/[0.02] px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            Delete Cup
          </button>
          <button
            type="button"
            onClick={saveAll}
            disabled={loading || !isDirty}
            aria-disabled={loading || !isDirty}
            className={`rounded-xl px-5 py-2 text-xs font-bold transition-all ${
              loading
                ? "bg-white/[0.06] text-white/40 cursor-wait"
                : isDirty
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                  : "border border-white/[0.08] bg-white/[0.03] text-white/25 cursor-not-allowed"
            }`}
          >
            {loading ? "Saving…" : "Save all"}
          </button>
        </div>
      </div>

      {/* Editor Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-white/[0.06] pb-3">
        {editorTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setMessage(null);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide border transition-all duration-200 ${
                active
                  ? "bg-amber-500/[0.06] border-amber-500/25 text-amber-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                  : "border-transparent text-white/45 hover:bg-white/[0.02] hover:text-white/80"
              }`}
            >
              <span className={active ? "text-amber-400" : "text-white/40"}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6 pt-2">
        {/* Tab 1: General Info */}
        {activeTab === "general" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Name & Game Details"
              showsOn="Cups list, cup page title, and esports hub card"
              viewHref={cupUrl}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Cup Title</label>
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. VALORANT CUP II"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Game Title</label>
                  <select
                    className={inputClass}
                    value={form.game}
                    onChange={(e) => {
                      const next = e.target.value;
                      setForm({
                        ...form,
                        game: next,
                        registrationFormat: SUPPORTS_FORMAT.includes(next) ? "AUCTION" : form.registrationFormat,
                      });
                    }}
                  >
                    <option value="VALORANT" className="bg-[#0a1020]">Valorant</option>
                    <option value="CS2" className="bg-[#0a1020]">CS2</option>
                    <option value="EA_FC26" className="bg-[#0a1020]">EA FC26</option>
                    <option value="OTHER" className="bg-[#0a1020]">Other</option>
                  </select>
                </div>
              </div>



              {/* Registration Format — Valorant & CS2 */}
              {SUPPORTS_FORMAT.includes(form.game) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Registration Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, registrationFormat: "AUCTION" })}
                      className={`rounded-xl border px-4 py-3 text-left transition-all ${
                        form.registrationFormat === "AUCTION" || !form.registrationFormat
                          ? "border-cyan-500/40 bg-cyan-500/[0.08] text-cyan-200"
                          : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20"
                      }`}
                    >
                      <p className="text-sm font-semibold">Auction Draft</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-white/40">Captains register a team name{form.coCaptainSlots > 0 ? ` and up to ${form.coCaptainSlots} co-captain${form.coCaptainSlots > 1 ? "s" : ""}` : ""}. Players join the pool. Admin assigns after auction.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, registrationFormat: "STANDARD" })}
                      className={`rounded-xl border px-4 py-3 text-left transition-all ${
                        form.registrationFormat === "STANDARD"
                          ? "border-indigo-500/40 bg-indigo-500/[0.08] text-indigo-200"
                          : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20"
                      }`}
                    >
                      <p className="text-sm font-semibold">Standard (5v5)</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-white/40">Captain registers full 5-player team upfront. All 5 must have NTG accounts.</p>
                    </button>
                  </div>
                </div>
              )}


            </AdminSection>

            <AdminSection
              title="Status Settings"
              showsOn="Visual placement and hub registration control"
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Current Status</label>
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="DRAFT" className="bg-[#0a1020]">Draft (admin only, hidden from cups list badge)</option>
                    <option value="UPCOMING" className="bg-[#0a1020]">Upcoming (announced, registration not open)</option>
                    <option value="REGISTRATION_OPEN" className="bg-[#0a1020]">Registration Open</option>
                    <option value="IN_PROGRESS" className="bg-[#0a1020]">Live (Ongoing)</option>
                    <option value="COMPLETED" className="bg-[#0a1020]">Completed</option>
                    <option value="CANCELLED" className="bg-[#0a1020]">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className={checkboxLabelClass}>
                    <input
                      type="checkbox"
                      className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-0"
                      checked={form.autoManageStatus}
                      onChange={(e) => setForm({ ...form, autoManageStatus: e.target.checked })}
                    />
                    <div>
                      <p className="font-semibold text-white/95">Auto-manage status from dates</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        Opens registration on the date below, goes Live 1 min before cup start, completes after cup end
                      </p>
                    </div>
                  </label>
                </div>

                {form.autoManageStatus ? (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/85">
                    Status updates automatically from your schedule. Turn this off to control status manually.
                  </p>
                ) : null}

                <div>
                  <label className={checkboxLabelClass}>
                    <input
                      type="checkbox"
                      className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-0"
                      checked={form.showOnEsportsHub}
                      onChange={(e) => setForm({ ...form, showOnEsportsHub: e.target.checked })}
                    />
                    <div>
                      <p className="font-semibold text-white/95">Feature on Esports Hub</p>
                      <p className="text-xs text-white/40 mt-0.5">Sorts first in the esports hub registration slideshow</p>
                    </div>
                  </label>
                </div>

                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    isRegistrationOpen
                      ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200/90"
                      : "border-white/[0.06] bg-white/[0.02] text-white/45"
                  }`}
                >
                  {isRegistrationOpen ? (
                    <p>
                      <strong className="text-emerald-300">Registration is live</strong>. Visible on{" "}
                      <a href={hubUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                        /esports
                      </a>{" "}
                      and the cup register form.
                      {form.autoManageStatus
                        ? isAuctionFormat
                          ? " Auto-manage will close registration 1 minute before auction starts."
                          : " Auto-manage will close registration 1 minute before cup start."
                        : " Change status manually when you want to close it."}
                    </p>
                  ) : form.autoManageStatus ? (
                    <p>
                      Registration opens automatically on the scheduled date, or is currently closed.
                      Set dates in the schedule section below.
                    </p>
                  ) : (
                    <p>Set status to <strong>Registration Open</strong> and save to show the hub card and register form.</p>
                  )}
                </div>
              </div>
            </AdminSection>

            <AdminSection
              title="Cup rulebook"
              showsOn="Linked from the registration form when players agree to rules"
            >
              <RulebookUploadField
                label="Rulebook (PDF or Word)"
                prefix={`tournaments/${form.slug}/rulebook`}
                currentUrl={form.rulebookUrl}
                onUploaded={(url) => setForm({ ...form, rulebookUrl: url })}
                onUploadedComplete={async (url) => {
                  await patchField({ rulebookUrl: url }, "Cup rulebook saved.");
                }}
                onClear={async () => {
                  setForm({ ...form, rulebookUrl: null });
                  await patchField({ rulebookUrl: null }, "Cup rulebook removed.");
                }}
                hint="Upload the organizer's rulebook. Players must agree to it before registering."
              />
            </AdminSection>

            <AdminSection
              title="Tournament Schedule"
              showsOn={
                form.autoManageStatus
                  ? "Dates drive registration open, live, and completed status"
                  : "Display date on esports hub card and cup page"
              }
              viewHref={cupUrl}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Registration opens
                  </label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={toLocalDatetime(form.registrationOpensAt)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        registrationOpensAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                  />
                  <p className="text-xs text-white/35">
                    {isAuctionFormat
                      ? "Registration closes automatically 1 minute before auction starts. No separate end date needed."
                      : "Registration closes automatically 1 minute before cup start. No separate end date needed."}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Cup Tournament Starts</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={toLocalDatetime(form.startsAt)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        startsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Cup Tournament Ends</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={toLocalDatetime(form.endsAt)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        endsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
                {form.registrationFormat === "AUCTION" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Auction Starts</label>
                      <input
                        type="datetime-local"
                        className={inputClass}
                        value={toLocalDatetime(form.auctionStartsAt)}
                        onChange={(e) =>
                          setForm({ ...form, auctionStartsAt: e.target.value ? new Date(e.target.value).toISOString() : null })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Auction Ends</label>
                      <input
                        type="datetime-local"
                        className={inputClass}
                        value={toLocalDatetime(form.auctionEndsAt)}
                        onChange={(e) =>
                          setForm({ ...form, auctionEndsAt: e.target.value ? new Date(e.target.value).toISOString() : null })
                        }
                      />
                    </div>
                    <p className="text-xs text-white/35 sm:col-span-2">
                      The &quot;Auction is live&quot; countdown banner displays on the homepage while the auction is live.
                    </p>
                  </>
                ) : null}
              </div>
            </AdminSection>
          </div>
        )}

        {activeTab === "auction" && form.registrationFormat === "AUCTION" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Auction Draft Setup"
              showsOn="Auction economy and settings used by the bidding platform"
            >
              <div className="mt-2 space-y-4 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-200/80">Auction Draft Settings</p>
                <p className="-mt-2 text-[10px] leading-relaxed text-white/40">
                  Configure budget, roster limits, and minimum bidding increments. Rank point values are set inside the auction app. Save changes to apply.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Co-Captain Slots</label>
                    <select
                      className={inputClass}
                      value={form.coCaptainSlots}
                      onChange={(e) => setForm({ ...form, coCaptainSlots: Number(e.target.value) })}
                    >
                      {[0, 1, 2, 3, 4].map((n) => (
                        <option key={n} value={n} className="bg-[#0a1020]">
                          {n === 0 ? "0 — Captain only" : `${n} co-captain${n > 1 ? "s" : ""}`}
                        </option>
                      ))}
                    </select>
                  </div>
                   <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Starting Budget</label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={form.startingBudget === 0 ? "" : form.startingBudget}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm({ ...form, startingBudget: val === "" ? 0 : Number(val) });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Roster Size (picks)</label>
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      value={form.rosterSize === 0 ? "" : form.rosterSize}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm({ ...form, rosterSize: val === "" ? 0 : Number(val) });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Min Bid Increment</label>
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      value={form.minBidIncrement === 0 ? "" : form.minBidIncrement}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm({ ...form, minBidIncrement: val === "" ? 0 : Number(val) });
                      }}
                    />
                  </div>
                </div>
                {form.game === "VALORANT" && (
                  <div className="space-y-3 border-t border-white/[0.04] pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-white/55">Rank Points</label>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-white/35">
                          Base points every player of a rank starts at. Sent to the auction app on Create — still editable there.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, rankPoints: DEFAULT_VALORANT_RANK_POINTS })}
                        className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/50 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {(form.rankPoints ?? DEFAULT_VALORANT_RANK_POINTS).map((row, i) => (
                        <div
                          key={row.rank}
                          className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 transition-colors focus-within:border-cyan-400/40 focus-within:bg-cyan-500/[0.04]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: RANK_DOT[row.rank] ?? "#6b7280" }} />
                            <span className="text-[11px] font-medium text-white/70">{row.rank}</span>
                          </div>
                          <input
                            type="number"
                            min={0}
                            aria-label={`${row.rank} points`}
                            value={row.floor === 0 ? "" : row.floor}
                            placeholder="0"
                            onChange={(e) => {
                              const val = e.target.value;
                              const num = val === "" ? 0 : Number(val);
                              const base = form.rankPoints ?? DEFAULT_VALORANT_RANK_POINTS;
                              const next = base.map((r, j) => (j === i ? { ...r, floor: num } : r));
                              setForm({ ...form, rankPoints: next });
                            }}
                            className="mt-2 w-full rounded-md border border-white/10 bg-[#0a1020]/60 px-2.5 py-1.5 text-sm font-mono tabular-nums text-white focus:border-cyan-500/40 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-white/[0.04] pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-white/80">Initialize Auction Instance</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">Sends current configurations to register the cup in the auction platform.</p>
                  </div>
                  <button
                    type="button"
                    onClick={createAuction}
                    disabled={loading}
                    className="cta inline-flex rounded-full px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Create / Reset Auction"}
                  </button>
                </div>

                {/* Public Auction Visibility Toggle */}
                {(() => {
                  const autoManaged = !!(form.autoManageStatus && form.auctionStartsAt && form.auctionEndsAt);
                  return (
                    <div className="border-t border-white/[0.04] pt-4 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-white/80">Public Auction Visibility</h4>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          When enabled, the "Enter Auction" button becomes visible to all registered users on the tournament details page.
                        </p>
                        {autoManaged && (
                          <p className="text-[10px] text-cyan-300/70 mt-1">
                            Auto-managed by the auction schedule — on automatically during the live window, off otherwise.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={autoManaged}
                        onClick={() => {
                          const nextVal = !form.publicAuction;
                          setForm({ ...form, publicAuction: nextVal });
                          // Save immediately when toggled
                          fetch(`/api/admin/tournaments/${form.slug}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ publicAuction: nextVal }),
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          autoManaged ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                        } ${form.publicAuction ? "bg-cyan-500" : "bg-white/[0.12]"}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            form.publicAuction ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })()}

                {/* Direct Link to Auction Site */}
                {auctionHref && (
                  <div className="border-t border-white/[0.04] pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-white/80">Direct Link to Auction Site</h4>
                      <p className="text-[10px] text-white/40 mt-0.5">Open the external auction interface to manage live bidding, teams, and drafts.</p>
                    </div>
                    <a
                      href={auctionHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 transition-colors hover:bg-cyan-500/20"
                    >
                      Go to Auction Site →
                    </a>
                  </div>
                )}
              </div>
            </AdminSection>
          </div>
        )}

        {/* Tab 2: Branding & Media */}
        {activeTab === "media" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Banner & Artwork Uploads"
              showsOn="Background layers on Esports Hub cards and individual detail heroes"
              viewHref={hubUrl}
              viewLabel="Esports Hub Preview"
            >
              <div className="space-y-6">
                <ImageUploadField
                  label="Esports Hub Card Background"
                  hint="Banner background overlay behind registration open cards on /esports"
                  prefix={`tournaments/${form.slug}/hub`}
                  currentUrl={form.hubBannerUrl}
                  onUploaded={(url) => setForm({ ...form, hubBannerUrl: url, posterUrl: url })}
                  onUploadedComplete={async (url) => {
                    await patchCupBannerImage(url, "Hub background image saved.");
                  }}
                  onClear={async () => {
                    setForm({ ...form, hubBannerUrl: null, posterUrl: null });
                    await patchCupBannerImage(null, "Hub background image removed.");
                  }}
                />



                {/* Carousel slides section removed — hub banner is sufficient */}
              </div>
            </AdminSection>
          </div>
        )}

        {/* Tab 3: Prizes */}
        {activeTab === "prizes" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Prizepool Amount & Split breakdown"
              showsOn="Prize money cards on the cup sidebar and info tables"
              viewHref={cupUrl}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Total Prizepool (₹)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={form.prizePool ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const cleaned = (val.length > 1 && val.startsWith("0")) ? val.replace(/^0+/, "") : val;
                      setForm({ ...form, prizePool: cleaned || null });
                    }}
                    placeholder="e.g. 15000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Prizepool Notes</label>
                  <input
                    className={inputClass}
                    value={form.prizeNotes ?? ""}
                    onChange={(e) => setForm({ ...form, prizeNotes: e.target.value || null })}
                    placeholder="e.g. MVP receives additional bonuses"
                  />
                </div>
              </div>

              <div className="border-t border-white/[0.04] pt-5 space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">Payout Distribution</h3>
                  <p className="text-xs text-white/40 mt-1">Split totals will dynamically allocate based on the values below.</p>
                </div>
                
                <div className="space-y-3">
                  {prizeSplitDisplay.map((row, i) => (
                    <div key={`${row.place}-${i}`} className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-full sm:w-1/4">
                        <span className="text-xs font-semibold text-white/55">Place #{row.place}</span>
                      </div>
                      <div className="w-full sm:flex-1">
                        <input
                          className={inputClass}
                          value={row.label}
                          onChange={(e) => updateSplit(i, "label", e.target.value)}
                          placeholder="Label (e.g. Champion)"
                        />
                      </div>
                      <div className="w-full sm:w-1/3">
                        <div className="relative">
                          <span className="absolute left-3 top-3.5 text-xs text-white/30 font-medium">₹</span>
                          <input
                            type="number"
                            className={`${inputClass} pl-7`}
                            value={row.amount}
                            onChange={(e) => {
                              const val = e.target.value;
                              const cleaned = (val.length > 1 && val.startsWith("0")) ? val.replace(/^0+/, "") : val;
                              updateSplit(i, "amount", cleaned);
                            }}
                            placeholder="Amount"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSplitRow(i)}
                        className="shrink-0 rounded-lg border border-rose-500/20 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300 hover:bg-rose-500/10"
                        aria-label={`Remove place ${row.place}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addSplitRow}
                  className="rounded-xl border border-dashed border-white/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/55 hover:border-white/30 hover:text-white/80"
                >
                  + Add place
                </button>
              </div>
            </AdminSection>
          </div>
        )}

        {/* Tab 4: Bracket & MVP */}
        {activeTab === "standings" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Bracket Link & MVP"
              showsOn="Challonge bracket on the cup page; MVP card in Final Results"
              viewHref={cupUrl}
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Challonge URL Link</label>
                  <input
                    className={inputClass}
                    value={form.bracketUrl ?? ""}
                    onChange={(e) => setForm({ ...form, bracketUrl: e.target.value || null })}
                    placeholder="e.g. https://challonge.com/jyln1rx4"
                  />
                  <p className="text-[10px] text-white/30 italic">
                    Winner and runner-up are loaded from this bracket. Links are verified and normalized automatically.
                  </p>
                </div>

                <div className="border-t border-white/[0.04] pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Tournament MVP</label>
                    <label className="flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={!mvpEnabled}
                        onChange={(e) => setMvpEnabled(!e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-[var(--color-iris)] focus:ring-[var(--color-iris)] focus:ring-offset-0 cursor-pointer"
                      />
                      N/A (Clear MVP)
                    </label>
                  </div>

                  {mvpEnabled ? (
                    <div className="space-y-2 relative">
                      <input
                        className={inputClass}
                        value={mvpSearch}
                        onChange={(e) => {
                          setMvpSearch(e.target.value);
                          setSelectedMvp(null);
                        }}
                        placeholder="Search for a registered user..."
                      />
                      {mvpResults.length > 0 && !selectedMvp ? (
                        <ul className="absolute z-10 w-full max-h-40 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0a1020] shadow-xl mt-1">
                          {mvpResults.map((m) => {
                            const label = m.displayName ?? m.name ?? m.email ?? "Member";
                            return (
                              <li key={m.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMvp({ id: m.id, label });
                                    setMvpSearch(label);
                                    setMvpResults([]);
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs text-white/75 hover:bg-white/[0.04]"
                                >
                                  <span className="font-medium text-white/90">{label}</span>
                                  {m.email ? (
                                    <span className="ml-2 text-white/40">{m.email}</span>
                                  ) : null}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs italic text-white/30 rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                      MVP is disabled. Saving will remove the MVP from the tournament results.
                    </p>
                  )}
                  <p className="text-[10px] text-white/40">
                    Optional. Shown on the cup page below the Challonge results.
                  </p>
                </div>
              </div>
            </AdminSection>
          </div>
        )}

        {/* Tab: Registrations */}
        {activeTab === "registrations" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Cup registrations"
              showsOn="Player sign-ups with profile snapshots at registration time"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <p className="text-sm text-white/45">{registrations.length} registered</p>
                <a
                  href={`/api/admin/tournaments/${form.slug}/registrations/export`}
                  className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/65 hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  Export CSV
                </a>
              </div>

              <div className="mb-6 space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Add existing member to cup</p>
                  <p className="text-[10px] text-white/35">Search by name or email. Only NTG-registered accounts can be added.</p>
                </div>
                <div className="space-y-2">
                  <input
                    className={inputClass}
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setSelectedMember(null);
                    }}
                    placeholder="Search by name, email, or username…"
                  />
                  {memberResults.length > 0 && !selectedMember ? (
                    <ul className="max-h-40 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0a1020]/80">
                      {memberResults.map((m) => {
                        const label =
                          m.displayName ?? m.name ?? m.email ?? "Member";
                        return (
                          <li key={m.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMember({ id: m.id, label });
                                setMemberSearch(label);
                                setMemberResults([]);
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-white/75 hover:bg-white/[0.04]"
                            >
                              <span className="font-medium text-white/90">{label}</span>
                              {m.email ? (
                                <span className="ml-2 text-white/40">{m.email}</span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Role</label>
                    <select
                      className={inputClass}
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value as "PLAYER" | "CAPTAIN")}
                    >
                      {isAuctionFormat ? (
                        <>
                          <option value="PLAYER" className="bg-[#0a1020]">Player</option>
                          <option value="CAPTAIN" className="bg-[#0a1020]">Captain (creates team)</option>
                        </>
                      ) : (
                        <option value="CAPTAIN" className="bg-[#0a1020]">Captain (creates team)</option>
                      )}
                    </select>
                  </div>
                  {addRole === "CAPTAIN" ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Team name</label>
                        <input
                          className={inputClass}
                          value={addTeamName}
                          onChange={(e) => setAddTeamName(e.target.value)}
                          placeholder="Team name"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        {isStandardFormat ? (
                          <>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Teammate usernames (4)</label>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {addMemberUsernames.map((username, index) => (
                                <input
                                  key={index}
                                  className={inputClass}
                                  value={username}
                                  onChange={(e) => {
                                    const next = [...addMemberUsernames];
                                    next[index] = e.target.value;
                                    setAddMemberUsernames(next);
                                  }}
                                  placeholder={`Teammate ${index + 1}`}
                                />
                              ))}
                            </div>
                          </>
                        ) : form.coCaptainSlots > 0 ? (
                          <>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                              Co-captain username{form.coCaptainSlots > 1 ? "s" : ""}
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {Array.from({ length: form.coCaptainSlots }, (_, index) => (
                                <input
                                  key={index}
                                  className={inputClass}
                                  value={addCoCaptainUsernames[index] ?? ""}
                                  onChange={(e) => {
                                    const next = [...addCoCaptainUsernames];
                                    next[index] = e.target.value;
                                    setAddCoCaptainUsernames(next);
                                  }}
                                  placeholder={`Co-captain ${index + 1}`}
                                />
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={addMemberRegistration}
                  disabled={
                    addingMember ||
                    !selectedMember ||
                    (addRole === "CAPTAIN" &&
                      (!addTeamName.trim() ||
                        (isAuctionFormat &&
                          form.coCaptainSlots > 0 &&
                          !addCoCaptainUsernames
                            .slice(0, form.coCaptainSlots)
                            .every((u) => u.trim().length >= 2)) ||
                        (isStandardFormat && !addMemberUsernames.every((u) => u.trim().length >= 2))))
                  }
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {addingMember ? "Adding…" : "Add to cup"}
                </button>
              </div>

              {registrations.length === 0 ? (
                <p className="text-sm text-white/35">No registrations yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                  <table className="min-w-full text-left text-xs text-white/70">
                    <thead className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] uppercase tracking-wider text-white/40">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Team</th>
                        {form.game === "CS2" ? (
                          <>
                            <th className="px-3 py-2">Steam64</th>
                            <th className="px-3 py-2">Hours</th>
                            <th className="px-3 py-2">Faceit</th>
                            <th className="px-3 py-2">Premier</th>
                          </>
                        ) : form.game === "EA_FC26" ? (
                          <>
                            <th className="px-3 py-2">Olympus</th>
                            <th className="px-3 py-2">Partner username</th>
                            <th className="px-3 py-2">Partner</th>
                          </>
                        ) : (
                          <>
                            <th className="px-3 py-2">Riot ID</th>
                            <th className="px-3 py-2">Rank</th>
                            <th className="px-3 py-2">Roles</th>
                          </>
                        )}
                        <th className="px-3 py-2">Registered</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((r) => (
                        <tr key={r.id} className="border-b border-white/[0.04]">
                          <td className="px-3 py-2 font-medium text-white/85">{r.displayName ?? "—"}</td>
                          <td className="px-3 py-2">{r.email ?? "—"}</td>
                          <td className="px-3 py-2 font-mono">{r.phone ?? "—"}</td>
                          <td className="px-3 py-2">{formatParticipantRole(r.participantRole)}</td>
                          <td className="px-3 py-2">{r.teamName ?? "—"}</td>
                          {form.game === "CS2" ? (
                            <>
                              <td className="px-3 py-2 font-mono">{r.steamId64 ?? "—"}</td>
                              <td className="px-3 py-2">{r.cs2Hours != null ? Math.round(r.cs2Hours) : "—"}</td>
                              <td className="px-3 py-2">{r.cs2FaceitRank ?? "—"}</td>
                              <td className="px-3 py-2">{r.cs2PeakPremier ?? "—"}</td>
                            </>
                          ) : form.game === "EA_FC26" ? (
                            <>
                              <td className="px-3 py-2">{r.olympusId ?? "—"}</td>
                              <td className="px-3 py-2">{r.partnerUsername ?? "—"}</td>
                              <td className="px-3 py-2">{r.partnerName ?? "—"}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 font-mono">{r.riotId ?? "—"}</td>
                              <td className="px-3 py-2">{r.rankTier ?? "—"}</td>
                              <td className="px-3 py-2">{r.valorantRoles ?? "—"}</td>
                            </>
                          )}
                          <td className="px-3 py-2 whitespace-nowrap text-white/45">
                            {new Date(r.createdAt).toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => requestRemoveRegistration(r)}
                              className="rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-2.5 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/10"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminSection>
          </div>
        )}

        {/* Tab 5: Teams & Players */}
        {activeTab === "teams" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Participating Teams"
              showsOn="Registered rosters displaying inside teams overlays"
              viewHref={cupUrl}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <p className="text-sm text-white/45">
                  {tournamentTeams.length} team{tournamentTeams.length === 1 ? "" : "s"}
                </p>
                {tournamentTeams.length > 0 ? (
                  <a
                    href={`/api/admin/tournaments/${form.slug}/teams/export`}
                    className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/65 hover:bg-white/[0.06] hover:text-white transition-colors"
                  >
                    Export CSV
                  </a>
                ) : null}
              </div>
              <div className="space-y-6">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <p className="text-xs text-white/50">
                    {isAuctionFormat ? (
                      <>
                        <span className="font-semibold text-white/70">Auction rosters:</span> captains register with a team name
                        {form.coCaptainSlots > 0
                          ? ` and ${form.coCaptainSlots} co-captain${form.coCaptainSlots > 1 ? "s" : ""}`
                          : ""}{" "}
                        at signup.
                        After the draft, assign players from the pool to each team below.
                      </>
                    ) : isStandardFormat ? (
                      <>
                        <span className="font-semibold text-white/70">Standard rosters:</span> captains register the full 5-player team at signup.
                        All players appear under their team below.
                      </>
                    ) : (
                      <>Registered teams and rosters for this cup.</>
                    )}
                  </p>
                  {isAuctionFormat && poolPlayers.length > 0 ? (
                    <p className="mt-2 text-xs text-[var(--color-brand)]/80">
                      {poolPlayers.length} unassigned player{poolPlayers.length === 1 ? "" : "s"} in the pool
                    </p>
                  ) : null}
                </div>

                {/* Team Lists */}
                {tournamentTeams.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
                    No teams registered for this tournament yet.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {tournamentTeams.map((team) => (
                      <div key={team.id} className="rounded-xl border border-white/[0.06] bg-[#0c1424]/40 p-4.5 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {team.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={team.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                            ) : null}
                            <p className="font-bold text-white text-sm truncate">{team.name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => requestRemoveTeam(team.id, team.name)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove Team
                          </button>
                        </div>

                        {/* Roster: leadership + drafted players */}
                        <ul className="space-y-1.5 min-h-[3rem]">
                          {(() => {
                            const matchingRegs = registrations.filter(
                              (r) => r.teamId === team.id,
                            );
                            const leadership = matchingRegs.filter((r) =>
                              ["CAPTAIN", "CO_CAPTAIN"].includes(r.participantRole),
                            );
                            const rosterPlayers = matchingRegs.filter((r) => r.participantRole === "PLAYER");
                            const rosterRegistrationIds = new Set(matchingRegs.map((r) => r.id));
                            const drafted = team.players.filter(
                              (p) => !p.registrationId || !rosterRegistrationIds.has(p.registrationId),
                            );

                            if (leadership.length === 0 && rosterPlayers.length === 0 && drafted.length === 0) {
                              return (
                                <p className="text-xs text-white/30 italic">
                                  {isAuctionFormat
                                    ? form.coCaptainSlots > 0
                                      ? "Captain and co-captain(s) appear here after team registration."
                                      : "Captain appears here after team registration."
                                    : "Team roster appears here after registration."}
                                </p>
                              );
                            }

                            return (
                              <>
                                {leadership.map((r) => (
                                  <li
                                    key={r.id}
                                    className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.03] px-3 py-1.5 text-xs text-white/70"
                                  >
                                    <div>
                                      <span className="font-medium">{r.displayName}</span>
                                      <span className="ml-2 text-white/40 text-[10px] uppercase">
                                        {formatParticipantRole(r.participantRole)}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => requestRemoveRosterMember(team, r)}
                                      className="text-[10px] text-rose-300 hover:text-rose-200"
                                    >
                                      Remove
                                    </button>
                                  </li>
                                ))}
                                {rosterPlayers.map((r) => (
                                  <li
                                    key={r.id}
                                    className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.03] px-3 py-1.5 text-xs text-white/70"
                                  >
                                    <div>
                                      <span className="font-medium">{r.displayName}</span>
                                      <span className="ml-2 text-white/40 text-[10px] uppercase">Player</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => requestRemoveRosterMember(team, r)}
                                      className="text-[10px] text-rose-300 hover:text-rose-200"
                                    >
                                      Remove
                                    </button>
                                  </li>
                                ))}
                                {drafted.map((p) => (
                                  <li
                                    key={p.id}
                                    className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.03] px-3 py-1.5 text-xs text-white/70"
                                  >
                                    <div>
                                      <span className="font-medium">{p.displayName}</span>
                                      <span className="ml-2 text-white/40 text-[10px] uppercase">Drafted</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => requestRemovePlayer(team.id, p.id, p.displayName)}
                                      className="text-[10px] text-rose-300 hover:text-rose-200"
                                    >
                                      Remove
                                    </button>
                                  </li>
                                ))}
                              </>
                            );
                          })()}
                        </ul>

                        {isAuctionFormat && poolPlayers.length > 0 ? (
                          <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3 sm:flex-row">
                            <select
                              className={`${inputClass} flex-1`}
                              value={poolPick[team.id] ?? ""}
                              onChange={(e) =>
                                setPoolPick((prev) => ({ ...prev, [team.id]: e.target.value }))
                              }
                            >
                              <option value="" className="bg-[#0a1020]">
                                Add from player pool…
                              </option>
                              {poolPlayers.map((p) => (
                                <option key={p.id} value={p.id} className="bg-[#0a1020]">
                                  {p.displayName}
                                  {p.steamId64 ? ` · Steam` : p.riotId ? ` · ${p.riotId}` : ""}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => addPlayer(team.id)}
                              disabled={!poolPick[team.id]?.trim()}
                              className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                            >
                              Add to team
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AdminSection>
          </div>
        )}
      </div>

      {DeleteConfirmDialog}
    </div>
  );
}
