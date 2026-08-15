export type RosterPlayerView = {
  id: string;
  userId: string;
  displayName: string;
  riotId: string | null;
  riotPlayerCard: string | null;
  riotPlayerCardWide: string | null;
  rankTier: string | null;
  rankTierId: number | null;
  mmr: number | null;
  valorantRoles: string[];
  roleLabel: string | null;
  bio: string | null;
  steamId64: string | null;
  steamPersonaName: string | null;
  steamAvatarUrl: string | null;
  cs2PeakPremierRank: string | null;
  cs2FaceitRank: string | null;
  sortOrder: number;
};

export type RosterTeamView = {
  id: string;
  gameKey: string;
  gameLabel: string;
  status: "ACTIVE" | "RECRUITING";
  benefitsMarkdown: string | null;
  tryoutOpensAt: string | null;
  tryoutClosesAt: string | null;
  tryoutIsLive: boolean;
  tryoutSchedulePhase: "unscheduled" | "countdown" | "live" | "closed";
  sortOrder: number;
  players: RosterPlayerView[];
  tryoutListingSlug: string | null;
};

export type ListingPreview = {
  id: string;
  slug: string;
  type: "JOB" | "ROSTER_TRYOUT";
  title: string;
  description: string | null;
  gameKey: string | null;
  gameLabel: string | null;
  sortOrder: number;
  rulebookUrl: string | null;
  tryoutOpensAt: string | null;
  tryoutClosesAt: string | null;
  tryoutOpenDays: number | null;
  autoManageTryout: boolean;
  tryoutRepeatDays: number | null;
  tryoutIsLive: boolean;
};

export type ListingDetail = ListingPreview & {
  userApplied: boolean;
  applicationStatus: string | null;
  formFields: ListingFormFieldView[];
};

export type ListingFieldType =
  | "SECTION_HEADING"
  | "DESCRIPTION"
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "DROPDOWN"
  | "LINEAR_SCALE"
  | "MULTIPLE_CHOICE_GRID"
  | "CHECKBOX_GRID"
  | "DATE"
  | "TIME"
  | "FILE_UPLOAD";

export type ListingFormFieldView = {
  id: string;
  sortOrder: number;
  fieldType: ListingFieldType;
  label: string;
  helpText: string | null;
  required: boolean;
  options: string[];
  scaleMin: number;
  scaleMax: number;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  gridRows: string[];
  gridColumns: string[];
};

export type ListingFormResponses = Record<
  string,
  string | string[] | Record<string, string | string[]>
>;

export type ListingApplicantProfile = {
  displayName: string | null;
  email: string | null;
  phone: string | null;
  town: string | null;
  dateOfBirth: string | null;
  riotId: string | null;
  rankTier: string | null;
  valorantRoles: string[];
  steamId64: string | null;
  steamPersonaName: string | null;
  cs2PeakPremier: string | null;
  cs2FaceitRank: string | null;
  cs2Hours: number | null;
  rankMmr: number | null;
};

export type ListingEligibility = {
  canApply: boolean;
  missing: string[];
  /** Valorant tryouts only — applicant does not meet the hidden rank floor. */
  rankIneligible: boolean;
  displayName: string | null;
  profile: ListingApplicantProfile | null;
};
