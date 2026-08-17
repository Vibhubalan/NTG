import type { ListingFieldType } from "@prisma/client";

export type ListingFieldTypeName =
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
  fieldType: ListingFieldTypeName;
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

export type ListingFormResponses = Record<string, string | string[] | Record<string, string | string[]>>;

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
};

export const LISTING_DISPLAY_FIELD_TYPES: ListingFieldType[] = [
  "SECTION_HEADING",
  "DESCRIPTION",
];

export const LISTING_INPUT_FIELD_TYPES: ListingFieldType[] = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "DROPDOWN",
  "LINEAR_SCALE",
  "MULTIPLE_CHOICE_GRID",
  "CHECKBOX_GRID",
  "DATE",
  "TIME",
  "FILE_UPLOAD",
];

export const LISTING_CHOICE_FIELD_TYPES: ListingFieldType[] = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "DROPDOWN",
];

export function isListingInputField(fieldType: ListingFieldType | ListingFieldTypeName): boolean {
  return (LISTING_INPUT_FIELD_TYPES as string[]).includes(fieldType);
}

export function isGridField(fieldType: ListingFieldType | ListingFieldTypeName): boolean {
  return fieldType === "MULTIPLE_CHOICE_GRID" || fieldType === "CHECKBOX_GRID";
}

type StoredFieldOptions =
  | string[]
  | {
      scaleMin?: number;
      scaleMax?: number;
      scaleMinLabel?: string;
      scaleMaxLabel?: string;
      gridRows?: string[];
      gridColumns?: string[];
    };

export function parseFieldOptions(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options
    .filter((o): o is string => typeof o === "string")
    .map((o) => o.trim())
    .filter(Boolean);
}

function parseStoredOptions(options: unknown): StoredFieldOptions {
  if (Array.isArray(options)) return options;
  if (options && typeof options === "object") return options as StoredFieldOptions;
  return [];
}

export function mapListingFormField(row: {
  id: string;
  sortOrder: number;
  fieldType: ListingFieldType;
  label: string;
  helpText: string | null;
  required: boolean;
  options: unknown;
}): ListingFormFieldView {
  const stored = parseStoredOptions(row.options);
  const objectStored = !Array.isArray(stored) ? stored : null;

  return {
    id: row.id,
    sortOrder: row.sortOrder,
    fieldType: row.fieldType as ListingFieldTypeName,
    label: row.label,
    helpText: row.helpText,
    required: row.required,
    options: Array.isArray(stored) ? parseFieldOptions(stored) : [],
    scaleMin: objectStored?.scaleMin ?? 1,
    scaleMax: objectStored?.scaleMax ?? 5,
    scaleMinLabel: objectStored?.scaleMinLabel?.trim() || null,
    scaleMaxLabel: objectStored?.scaleMaxLabel?.trim() || null,
    gridRows: objectStored?.gridRows?.map((r) => r.trim()).filter(Boolean) ?? [],
    gridColumns: objectStored?.gridColumns?.map((c) => c.trim()).filter(Boolean) ?? [],
  };
}

export function serializeFieldOptions(field: {
  fieldType: ListingFieldType | ListingFieldTypeName;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string | null;
  scaleMaxLabel?: string | null;
  gridRows?: string[];
  gridColumns?: string[];
}): unknown {
  if (["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(field.fieldType)) {
    return (field.options ?? []).map((o) => o.trim()).filter(Boolean);
  }
  if (field.fieldType === "LINEAR_SCALE") {
    return {
      scaleMin: field.scaleMin ?? 1,
      scaleMax: field.scaleMax ?? 5,
      scaleMinLabel: field.scaleMinLabel?.trim() || undefined,
      scaleMaxLabel: field.scaleMaxLabel?.trim() || undefined,
    };
  }
  if (isGridField(field.fieldType)) {
    return {
      gridRows: (field.gridRows ?? []).map((r) => r.trim()).filter(Boolean),
      gridColumns: (field.gridColumns ?? []).map((c) => c.trim()).filter(Boolean),
    };
  }
  return null;
}

export function defaultJobFormTemplate(): Omit<ListingFormFieldView, "id">[] {
  return [
    {
      sortOrder: 0,
      fieldType: "SECTION_HEADING",
      label: "Role questions",
      helpText: null,
      required: false,
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      gridRows: [],
      gridColumns: [],
    },
    {
      sortOrder: 1,
      fieldType: "LONG_TEXT",
      label: "About you",
      helpText: "Who you are, what you're passionate about, and why NTG.",
      required: true,
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      gridRows: [],
      gridColumns: [],
    },
    {
      sortOrder: 2,
      fieldType: "LONG_TEXT",
      label: "Relevant experience",
      helpText: "Work history, projects, skills, or volunteer experience.",
      required: true,
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      gridRows: [],
      gridColumns: [],
    },
    {
      sortOrder: 3,
      fieldType: "SHORT_TEXT",
      label: "Expected compensation",
      helpText: "e.g. monthly stipend, hourly rate, or negotiable.",
      required: false,
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      gridRows: [],
      gridColumns: [],
    },
    {
      sortOrder: 4,
      fieldType: "FILE_UPLOAD",
      label: "Resume / portfolio",
      helpText: "Upload Excel, Word, PDF, or image (max 15 MB).",
      required: false,
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      gridRows: [],
      gridColumns: [],
    },
  ];
}

export function defaultTryoutFormTemplate(): Omit<ListingFormFieldView, "id">[] {
  return [
    {
      sortOrder: 0,
      fieldType: "LONG_TEXT",
      label: "Why do you want to join NTG?",
      helpText: "Your motivation and what you bring to the roster.",
      required: true,
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      gridRows: [],
      gridColumns: [],
    },
    {
      sortOrder: 1,
      fieldType: "LONG_TEXT",
      label: "Experience & availability",
      helpText: "Past teams, hours per week, preferred roles, etc.",
      required: false,
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      gridRows: [],
      gridColumns: [],
    },
  ];
}

function formatResponseValue(value: string | string[] | Record<string, string | string[]>): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  return Object.entries(value)
    .map(([row, col]) => `${row}: ${Array.isArray(col) ? col.join(", ") : col}`)
    .join("; ");
}

export function formatResponsesAsMessage(
  fields: ListingFormFieldView[],
  responses: ListingFormResponses,
): string {
  return fields
    .filter((f) => isListingInputField(f.fieldType))
    .map((f) => {
      const value = responses[f.id];
      if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
        return null;
      }
      if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
        return null;
      }
      return `[${f.label}]\n${formatResponseValue(value)}`;
    })
    .filter((line): line is string => Boolean(line))
    .join("\n\n");
}

export function formatResponseForDisplay(
  value: string | string[] | Record<string, string | string[]> | undefined,
): string {
  if (value == null) return "-";
  return formatResponseValue(value);
}
