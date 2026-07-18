import AdminBadgesPanel from "@/components/admin/AdminBadgesPanel";
import { listAllPlayerBadges, listTournamentsAdmin } from "@tournaments-leagues/index";
import { serverEnv } from "@core/config/env.server";

export const metadata = { title: "Admin Badges" };

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage() {
  const [badges, tournaments] = serverEnv.databaseUrl
    ? await Promise.all([listAllPlayerBadges(), listTournamentsAdmin()])
    : [[], []];

  return (
    <AdminBadgesPanel
      tournaments={tournaments.map((t) => ({ id: t.id, name: t.name }))}
      initialBadges={badges.map((b) => ({
        id: b.id,
        label: b.label,
        awardedAt: b.awardedAt.toISOString(),
        tournamentName: b.tournament?.name ?? null,
        user: {
          id: b.user.id,
          name: b.user.name,
          email: b.user.email,
          displayName: b.user.playerProfile?.displayName ?? null,
        },
      }))}
    />
  );
}
