/**
 * Valorant Agent Icon Resolver
 *
 * Provides high-resolution agent icons for match scoreboards.
 * Prefers local uploads in /images/agents/<agent-name>.png, then falls back to
 * official Riot API media CDN URLs.
 */

const LOCAL_AGENT_FILES: Record<string, string> = {
  astra: "/images/agents/astra.png",
  breach: "/images/agents/breach.png",
  brimstone: "/images/agents/brimstone.png",
  chamber: "/images/agents/chamber.png",
  clove: "/images/agents/clove.png",
  cypher: "/images/agents/cypher.png",
  deadlock: "/images/agents/deadlock.png",
  fade: "/images/agents/fade.png",
  gekko: "/images/agents/gekko.png",
  harbor: "/images/agents/harbor.png",
  iso: "/images/agents/iso.png",
  jett: "/images/agents/jett.png",
  kayo: "/images/agents/kayo.png",
  killjoy: "/images/agents/killjoy.png",
  miks: "/images/agents/miks.png",
  neon: "/images/agents/neon.png",
  omen: "/images/agents/omen.png",
  phoenix: "/images/agents/phoenix.png",
  raze: "/images/agents/raze.png",
  reyna: "/images/agents/reyna.png",
  sage: "/images/agents/sage.png",
  skye: "/images/agents/skye.png",
  sova: "/images/agents/sova.png",
  viper: "/images/agents/viper.png",
  tejo: "/images/agents/tejo.png",
  vyse: "/images/agents/vyse.png",
  waylay: "/images/agents/waylay.png",
  yoru: "/images/agents/yoru.png",
};

const AGENT_MEDIA_IDS: Record<string, string> = {
  astra: "41fb69c1-4189-7b37-f117-bcaf1e96f1bf",
  breach: "5f8671b7-4100-c266-1647-4fc598a3e89e",
  brimstone: "9f0677a8-425e-0e08-a3bb-32440e6ee867",
  chamber: "2293371e-4960-43be-9464-b35422b7332b",
  clove: "1dbf2edd-4729-0984-3115-f19944a36f1c",
  cypher: "11794410-4280-312b-471d-8794211b7237",
  deadlock: "cc8b02ea-4402-7707-3b43-6556805665ae",
  fade: "dde848b7-473f-0507-b65e-4f878c9e83a7",
  gekko: "e370fa57-4757-3604-1148-0389090f461e",
  harbor: "95b78d16-416d-c2b8-ad70-4b99ef7f2e8d",
  iso: "0e38b542-4189-a77a-92bd-8a90121d5a8d",
  jett: "5f8671b7-4100-c266-1647-4fc598a3e89e",
  kayo: "601d3b66-4b8b-b4d4-ac45-459d8066e29e",
  "kay/o": "601d3b66-4b8b-b4d4-ac45-459d8066e29e",
  killjoy: "1e58d927-48f8-b7eb-e702-17807064977d",
  neon: "bb2a4828-46eb-8cd1-e765-15848195d751",
  omen: "8e253c44-464d-ab5e-01a9-882226d11774",
  phoenix: "eb93336a-449b-9c1b-0a54-a891f7921d69",
  raze: "f94f3b27-42ee-09d1-edd1-3246d667137d",
  reyna: "a3bfb853-43b2-7238-a4f1-ad90e9e46bcc",
  sage: "56602543-4b07-963c-9b53-01a78e3f6821",
  skye: "6f2a04ca-43e0-be17-7f36-b05608693427",
  sova: "320b2a48-4d9b-a7d6-164e-9617d91f24d4",
  viper: "70773516-4015-804d-a5d3-4384c35299e8",
  vyse: "601d3b66-4b8b-b4d4-ac45-459d8066e29e",
  yoru: "7f54914f-40d0-4413-88b3-198b1c5b5459",
};

/**
 * Normalizes agent name string (e.g. "KAY/O" -> "kayo", "KillJoy" -> "killjoy")
 */
export function normalizeAgentKey(agentName: string | null | undefined): string {
  if (!agentName) return "";
  return agentName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Returns the primary display icon URL for a Valorant agent.
 * Checks for official Valorant API media CDN fallback.
 */
export function getAgentIconUrl(agentName: string | null | undefined): string | null {
  if (!agentName) return null;
  const key = normalizeAgentKey(agentName);

  if (LOCAL_AGENT_FILES[key]) {
    return LOCAL_AGENT_FILES[key];
  }

  const mediaId = AGENT_MEDIA_IDS[key];
  if (mediaId) {
    return `https://media.valorant-api.com/agents/${mediaId}/displayicon.png`;
  }
  return null;
}

/**
 * Returns agent background color / theme tint for visual accents.
 */
export type AgentRole = "Duelist" | "Initiator" | "Controller" | "Sentinel";

const AGENT_ROLE_MAP: Record<string, AgentRole> = {
  // Duelist: Jett, Phoenix, Reyna, Raze, Yoru, Neon, Iso, Waylay
  jett: "Duelist",
  phoenix: "Duelist",
  reyna: "Duelist",
  raze: "Duelist",
  yoru: "Duelist",
  neon: "Duelist",
  iso: "Duelist",
  waylay: "Duelist",

  // Initiator: Sova, Breach, Skye, KAY/O, Fade, Gekko, Tejo
  sova: "Initiator",
  breach: "Initiator",
  skye: "Initiator",
  kayo: "Initiator",
  fade: "Initiator",
  gekko: "Initiator",
  tejo: "Initiator",

  // Controller: Brimstone, Viper, Omen, Astra, Harbor, Clove, Miks
  brimstone: "Controller",
  viper: "Controller",
  omen: "Controller",
  astra: "Controller",
  harbor: "Controller",
  clove: "Controller",
  miks: "Controller",

  // Sentinel: Sage, Cypher, Killjoy, Chamber, Deadlock, Vyse, Veto
  sage: "Sentinel",
  cypher: "Sentinel",
  killjoy: "Sentinel",
  chamber: "Sentinel",
  deadlock: "Sentinel",
  vyse: "Sentinel",
  veto: "Sentinel",
};

export function getAgentRole(agentName: string | null | undefined): AgentRole | null {
  if (!agentName) return null;
  const key = normalizeAgentKey(agentName);
  return AGENT_ROLE_MAP[key] ?? null;
}

export function getAgentColorHex(agentName: string | null | undefined): string {
  const key = normalizeAgentKey(agentName);
  switch (key) {
    case "jett":
      return "#87ceeb";
    case "reyna":
      return "#a855f7";
    case "raze":
      return "#f97316";
    case "omen":
      return "#6366f1";
    case "cypher":
      return "#e2e8f0";
    case "fade":
      return "#64748b";
    case "killjoy":
      return "#eab308";
    case "sova":
      return "#38bdf8";
    case "viper":
      return "#22c55e";
    case "sage":
      return "#14b8a6";
    case "phoenix":
      return "#ef4444";
    case "chamber":
      return "#d97706";
    default:
      return "#3b82f6";
  }
}
