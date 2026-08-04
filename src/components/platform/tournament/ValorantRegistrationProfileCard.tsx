"use client";

import type { ValorantRegistrationProfileCard } from "@core/contracts/registration-profile";
import { formatRankLabel, rankIconUrl } from "@/lib/valorant-rank";
import { resolvePortraitCardArtUrl } from "@/lib/valorant-player-card";
import ValorantIngameNameplate from "@/components/platform/valorant/ValorantIngameNameplate";

const DEFAULT_CARD =
  "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png";

type Props = {
  profile: ValorantRegistrationProfileCard;
};

function RankColumn({
  label,
  tier,
  tierId,
}: {
  label: string;
  tier: string | null;
  tierId: number | null;
}) {
  const icon = rankIconUrl(tierId);
  const display = formatRankLabel(tierId, tier);

  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-2 sm:gap-2 sm:px-3 sm:py-3">
      <p className="text-[8px] font-bold tracking-wider text-white/35 uppercase sm:text-[9px]">
        {label}
      </p>
      <div className="flex h-8 w-8 items-center justify-center sm:h-10 sm:w-10">
        {icon ? (
          <img
            src={icon}
            alt=""
            className="h-8 w-8 object-contain drop-shadow-md sm:h-10 sm:w-10"
          />
        ) : (
          <div className="h-7 w-7 rounded-lg bg-white/10 sm:h-8 sm:w-8" />
        )}
      </div>
      <p className="w-full truncate text-center text-[11px] font-semibold text-white/85 sm:text-xs">
        {display}
      </p>
    </div>
  );
}

function ProfilePlayerCard({
  profile,
}: {
  profile: ValorantRegistrationProfileCard;
}) {
  const cardImg =
    resolvePortraitCardArtUrl(profile.riotPlayerCard, profile.riotPlayerCardWide) ??
    DEFAULT_CARD;
  const rankIcon = rankIconUrl(profile.currentRankTierId);
  const rankLabel = formatRankLabel(
    profile.currentRankTierId,
    profile.currentRankTier,
  );
  const ingameName = profile.riotGameName ?? profile.displayName;

  return (
    <div className="group relative aspect-[268/640] w-[5.75rem] shrink-0 sm:w-[11rem]">
      <div className="absolute inset-0 flex flex-col justify-end overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 sm:rounded-2xl">
        <img
          src={cardImg}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />

        <div className="relative z-20 flex w-full flex-col items-center pb-1.5 text-center sm:pb-2">
          <div className="scale-90 sm:scale-100">
            <ValorantIngameNameplate name={ingameName} />
          </div>
          <div className="mt-1.5 mb-1 flex h-7 w-7 items-center justify-center sm:mt-2.5 sm:mb-2 sm:h-12 sm:w-12">
            {rankIcon ? (
              <img
                src={rankIcon}
                alt=""
                className="h-7 w-7 object-contain drop-shadow-lg sm:h-12 sm:w-12"
              />
            ) : (
              <div className="h-6 w-6 rounded-lg bg-white/10 sm:h-10 sm:w-10 sm:rounded-xl" />
            )}
          </div>
          <p className="px-1 font-display text-[8px] font-black tracking-wide text-white uppercase drop-shadow-md sm:px-2 sm:text-xs">
            {rankLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ValorantRegistrationProfileCard({ profile }: Props) {
  const auctionIcon = rankIconUrl(profile.auctionRankTierId);
  const auctionLabel = formatRankLabel(
    profile.auctionRankTierId,
    profile.auctionRankTier,
  );
  const rolesLabel =
    profile.valorantRoles.length > 0 ? profile.valorantRoles.join(" · ") : null;

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:gap-5">
      {/* Card + identity side-by-side on phone so the tall art doesn't force a long scroll */}
      <div className="flex min-w-0 items-start gap-3 sm:gap-5">
        <ProfilePlayerCard profile={profile} />

        <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-4">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
              <p className="text-[9px] font-bold tracking-wider text-[var(--color-brand)] uppercase">
                Your profile
              </p>
              {profile.teamName ? (
                <span className="inline-flex w-fit max-w-full items-center truncate rounded-md border border-[#22c55e]/30 bg-[#22c55e]/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#22c55e] uppercase shadow-sm sm:text-[10px] sm:px-2.5">
                  Team: {profile.teamName}
                </span>
              ) : null}
            </div>
            <h3 className="mt-0.5 break-words font-display text-lg font-bold text-white sm:mt-1 sm:text-2xl">
              {profile.displayName}
            </h3>
            {rolesLabel ? (
              <p className="mt-0.5 text-[10px] font-medium tracking-wide text-white/50 uppercase sm:text-xs">
                {rolesLabel}
              </p>
            ) : null}
            {profile.riotId ? (
              <p className="mt-0.5 break-all text-[11px] text-white/40 sm:text-xs">
                {profile.riotId}
              </p>
            ) : null}
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:gap-2.5">
            <RankColumn
              label="Current"
              tier={profile.currentRankTier}
              tierId={profile.currentRankTierId}
            />
            <RankColumn
              label="Peak"
              tier={profile.peakRankTier}
              tierId={profile.peakRankTierId}
            />
          </div>

          <div className="min-w-0 rounded-xl border border-[var(--color-brand)]/25 bg-[var(--color-brand)]/[0.08] px-2.5 py-2 sm:px-4 sm:py-3">
            <p className="text-[8px] font-bold tracking-wider text-white/40 uppercase sm:text-[9px]">
              Auction rank
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-2 sm:mt-2 sm:gap-3">
              {auctionIcon ? (
                <img
                  src={auctionIcon}
                  alt=""
                  className="h-7 w-7 shrink-0 object-contain sm:h-9 sm:w-9"
                />
              ) : (
                <div className="h-7 w-7 shrink-0 rounded-lg bg-white/10 sm:h-8 sm:w-8" />
              )}
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-white sm:text-lg">
                  {auctionLabel}
                </p>
                <p className="text-[10px] leading-snug text-white/45 sm:text-[11px]">
                  {profile.auctionRankSource === "CURRENT"
                    ? "Using your current act rank"
                    : "Using your peak rank (unranked this act)"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
