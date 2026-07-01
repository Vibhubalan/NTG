export type ProfileRequirementFix = {
  href: string;
  cta: string;
};

/** Map backend missing-profile copy to a deep link + clear call to action. */
export function profileRequirementFix(message: string): ProfileRequirementFix {
  const lower = message.toLowerCase();

  if (lower.includes("steam")) {
    return {
      href: "/profile?tab=games",
      cta: "Click here to link Steam in Game Accounts",
    };
  }

  if (lower.includes("riot")) {
    return {
      href: "/profile?tab=games",
      cta: "Click here to link Riot ID in Game Accounts",
    };
  }

  if (
    lower.includes("valorant role") ||
    lower.includes("faceit") ||
    lower.includes("premier") ||
    lower.includes("cs2")
  ) {
    return {
      href: "/profile?tab=games",
      cta: "Click here to update in Game Accounts",
    };
  }

  if (lower.includes("date of birth") || lower.includes("olympus")) {
    return {
      href: "/profile?tab=profile",
      cta: "Click here to update on your profile",
    };
  }

  return {
    href: "/profile",
    cta: "Click here to fix on your profile",
  };
}
