import type { TournamentStatus } from "@prisma/client";

const REGISTRATION_CLOSE_OFFSET_MS = 60 * 1000;

export type TournamentScheduleInput = {
  status: TournamentStatus;
  autoManageStatus: boolean;
  registrationOpensAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
};

export function getRegistrationCloseAt(startsAt: Date): Date {
  return new Date(startsAt.getTime() - REGISTRATION_CLOSE_OFFSET_MS);
}

export function hasValidAutoSchedule(t: TournamentScheduleInput): boolean {
  if (!t.registrationOpensAt || !t.startsAt || !t.endsAt) return false;
  const closeAt = getRegistrationCloseAt(t.startsAt);
  return (
    t.registrationOpensAt.getTime() < closeAt.getTime() &&
    closeAt.getTime() < t.endsAt.getTime()
  );
}

export function validateAutoSchedule(input: {
  registrationOpensAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
}): string | null {
  if (!input.registrationOpensAt || !input.startsAt || !input.endsAt) {
    return "Auto-manage requires registration open, cup start, and cup end dates.";
  }
  const closeAt = getRegistrationCloseAt(input.startsAt);
  if (input.registrationOpensAt.getTime() >= closeAt.getTime()) {
    return "Registration must open before it closes (1 minute before cup start).";
  }
  if (closeAt.getTime() >= input.endsAt.getTime()) {
    return "Cup end must be after cup start.";
  }
  return null;
}

export function computeAutoStatus(
  t: TournamentScheduleInput,
  now: Date = new Date(),
): TournamentStatus | null {
  if (!t.autoManageStatus || t.status === "CANCELLED") return null;
  if (!hasValidAutoSchedule(t)) return null;

  const opens = t.registrationOpensAt!.getTime();
  const closeAt = getRegistrationCloseAt(t.startsAt!).getTime();
  const ends = t.endsAt!.getTime();
  const ts = now.getTime();

  if (ts >= ends) return "COMPLETED";
  if (ts >= closeAt) return "IN_PROGRESS";
  if (ts >= opens) return "REGISTRATION_OPEN";
  return t.status;
}

export function isTournamentRegistrationLive(
  t: TournamentScheduleInput,
  now: Date = new Date(),
): boolean {
  if (t.autoManageStatus && hasValidAutoSchedule(t)) {
    const opens = t.registrationOpensAt!.getTime();
    const closeAt = getRegistrationCloseAt(t.startsAt!).getTime();
    const ts = now.getTime();
    return ts >= opens && ts < closeAt;
  }

  return t.status === "REGISTRATION_OPEN";
}
