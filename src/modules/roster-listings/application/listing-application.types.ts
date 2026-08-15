import type { ListingFormResponses } from "../domain/listing-form";

export type ListingApplyInput = {
  message?: string;
  responses?: ListingFormResponses;
  pastExperience?: string;
  resumeUrl?: string;
};