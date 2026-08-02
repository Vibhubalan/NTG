import type { TournamentScheduleCardView } from "@/lib/tournament-display";

type Props = {
  schedule: TournamentScheduleCardView;
};

function ScheduleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-[10px] font-medium tracking-[0.16em] text-white/35 uppercase sm:tracking-[0.2em]">
        {label}
      </p>
      <p className="break-words text-sm font-semibold leading-snug text-white/85">{value}</p>
    </div>
  );
}

export default function TournamentScheduleCard({ schedule }: Props) {
  return (
    <div className="min-w-0 rounded-[1.5rem] border border-white/[0.08] bg-[#0A0A0A]/80 p-5 shadow-xl backdrop-blur-xl sm:p-6">
      <p className="text-[10px] font-medium tracking-[0.2em] text-white/40 uppercase sm:tracking-[0.3em]">
        Schedule
      </p>
      <div className="mt-4 space-y-3.5">
        <ScheduleRow label="Registration Date:" value={schedule.registrationDate} />
        <ScheduleRow label="Auction Date:" value={schedule.auctionDate} />
        <ScheduleRow label="Game Dates:" value={schedule.tournamentDate} />
      </div>
    </div>
  );
}
