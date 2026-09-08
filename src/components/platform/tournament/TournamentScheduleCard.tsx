import type { TournamentScheduleCardView } from "@/lib/tournament-display";

type Props = {
  schedule: TournamentScheduleCardView;
  /** Compact 3-column strip — avoids tall empty side-by-side cards. */
  variant?: "card" | "strip";
};

function ScheduleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3">
      <p className="shrink-0 text-[10px] font-medium tracking-[0.14em] text-white/35 uppercase">
        {label}
      </p>
      <p className="min-w-0 text-right text-[13px] font-semibold leading-snug text-white/85">
        {value}
      </p>
    </div>
  );
}

function ScheduleCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium tracking-[0.14em] text-white/35 uppercase">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold leading-snug text-white/85 sm:text-sm">
        {value}
      </p>
    </div>
  );
}

export default function TournamentScheduleCard({
  schedule,
  variant = "card",
}: Props) {
  if (variant === "strip") {
    return (
      <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#0A0A0A]/80 p-4 shadow-xl backdrop-blur-xl sm:p-5">
        <p className="text-[10px] font-medium tracking-[0.2em] text-white/40 uppercase">
          Schedule
        </p>
        <div
          className={`mt-3 grid min-w-0 gap-3 sm:gap-5 ${
            schedule.auctionDate ? "sm:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          <ScheduleCell label="Registration" value={schedule.registrationDate} />
          {schedule.auctionDate ? (
            <ScheduleCell label="Auction" value={schedule.auctionDate} />
          ) : null}
          <ScheduleCell label="Games" value={schedule.tournamentDate} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 self-start rounded-2xl border border-white/[0.08] bg-[#0A0A0A]/80 p-4 shadow-xl backdrop-blur-xl sm:p-5">
      <p className="text-[10px] font-medium tracking-[0.2em] text-white/40 uppercase">
        Schedule
      </p>
      <div className="mt-3 space-y-2.5">
        <ScheduleRow label="Registration" value={schedule.registrationDate} />
        {schedule.auctionDate ? (
          <ScheduleRow label="Auction" value={schedule.auctionDate} />
        ) : null}
        <ScheduleRow label="Games" value={schedule.tournamentDate} />
      </div>
    </div>
  );
}
