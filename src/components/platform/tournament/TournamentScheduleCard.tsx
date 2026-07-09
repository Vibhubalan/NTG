import type { TournamentScheduleCardView } from "@/lib/tournament-display";

type Props = {
  schedule: TournamentScheduleCardView;
};

function ScheduleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p className="text-sm font-semibold leading-snug text-white/85">{value}</p>
    </div>
  );
}

export default function TournamentScheduleCard({ schedule }: Props) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.08] bg-[#0A0A0A]/80 p-6 shadow-xl backdrop-blur-xl">
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">Schedule</p>
      <div className="mt-4 space-y-3.5">
        <ScheduleRow label="Registration Date:" value={schedule.registrationDate} />
        <ScheduleRow label="Auction Date:" value={schedule.auctionDate} />
        <ScheduleRow label="Game Dates:" value={schedule.tournamentDate} />
      </div>
    </div>
  );
}
