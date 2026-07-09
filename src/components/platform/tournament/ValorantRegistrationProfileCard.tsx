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
    <div className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</p>
      <div className="flex h-10 w-10 items-center justify-center">
        {icon ? (
          <img src={icon} alt="" className="h-10 w-10 object-contain drop-shadow-md" />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-white/10" />
        )}
      </div>
      <p className="text-center text-xs font-semibold text-white/85">{display}</p>
    </div>
  );
}

function ProfilePlayerCard({
  profile,
}: {
  profile: ValorantRegistrationProfileCard;
}) {
  const cardImg =
    resolvePortraitCardArtUrl(profile.riotPlayerCard, profile.riotPlayerCardWide) ?? DEFAULT_CARD;
  const rankIcon = rankIconUrl(profile.currentRankTierId);
  const rankLabel = formatRankLabel(profile.currentRankTierId, profile.currentRankTier);
  const ingameName = profile.riotGameName ?? profile.displayName;

  return (
    <div className="group relative mx-auto aspect-[268/640] w-full max-w-[11rem] shrink-0 sm:mx-0">
      <div className="absolute inset-0 flex flex-col justify-end overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
        <img
          src={cardImg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top pointer-events-none"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10 pointer-events-none" />

        <div className="relative z-20 flex w-full flex-col items-center pb-2 text-center">
          <ValorantIngameNameplate name={ingameName} />
          <div className="mb-2 mt-2.5 flex h-10 w-10 items-center justify-center sm:h-12 sm:w-12">
            {rankIcon ? (
              <img src={rankIcon} alt="" className="h-10 w-10 object-contain drop-shadow-lg sm:h-12 sm:w-12" />
            ) : (
              <div className="h-8 w-8 rounded-xl bg-white/10 sm:h-10 sm:w-10" />
            )}
          </div>
          <p className="font-display text-[10px] font-black uppercase tracking-wide text-white drop-shadow-md sm:text-xs">
            {rankLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ValorantRegistrationProfileCard({ profile }: Props) {
  const auctionIcon = rankIconUrl(profile.auctionRankTierId);
  const auctionLabel = formatRankLabel(profile.auctionRankTierId, profile.auctionRankTier);
  const rolesLabel =
    profile.valorantRoles.length > 0 ? profile.valorantRoles.join(" · ") : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-stretch">
        <ProfilePlayerCard profile={profile} />

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--color-brand)]">
              Your profile
            </p>
            <h3 className="mt-1 font-display text-xl font-bold text-white sm:text-2xl">
              {profile.displayName}
            </h3>
            {rolesLabel ? (
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-white/50">
                {rolesLabel}
              </p>
            ) : null}
            {profile.riotId ? (
              <p className="mt-0.5 text-xs text-white/40">{profile.riotId}</p>
            ) : null}
          </div>

          <div className="flex gap-2.5">
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

          <div className="rounded-xl border border-[var(--color-brand)]/25 bg-[var(--color-brand)]/[0.08] px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">
              Auction rank
            </p>
            <div className="mt-2 flex items-center gap-3">
              {auctionIcon ? (
                <img src={auctionIcon} alt="" className="h-9 w-9 object-contain" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-white/10" />
              )}
              <div>
                <p className="font-display text-lg font-bold text-white">{auctionLabel}</p>
                <p className="text-[11px] text-white/45">
                  {profile.auctionRankSource === "CURRENT"
                    ? "Using your current act rank"
                    : "Using your peak rank (unranked this act)"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {profile.teamName ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">Team</p>
          <p className="mt-1 font-display text-lg font-bold text-white">{profile.teamName}</p>
        </div>
      ) : null}
    </div>
  );
}
