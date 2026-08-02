import PlatformHeader from "@/components/platform/shell/PlatformHeader";
import RosterHub from "@/components/platform/roster/RosterHub";
import { listRosterTeams } from "@roster-listings/index";
import { listOpenListings } from "@roster-listings/index";
import { CS2_ROSTER_CHARACTER_IMAGES } from "@/lib/cs2-roster-assets";
import { preload } from "react-dom";

export const revalidate = 120;

export const metadata = {
  title: "NTG Roster",
};

export default async function RosterPage() {
  for (const src of CS2_ROSTER_CHARACTER_IMAGES) {
    preload(src, { as: "image" });
  }

  const [teams, jobListings] = await Promise.all([
    listRosterTeams(),
    listOpenListings("JOB"),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <PlatformHeader
        eyebrow="NTG Esports"
        title="Official Roster"
        subtitle="Our competitive teams — and open team tryouts you can apply for right now."
      />
      <RosterHub teams={teams} jobListings={jobListings} />
    </div>
  );
}
