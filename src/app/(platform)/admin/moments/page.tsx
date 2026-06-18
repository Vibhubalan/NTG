import AdminMomentsPanel from "@/components/admin/AdminMomentsPanel";
import {
  listFeaturedDecksAdmin,
  listReelsAdmin,
} from "@socials-gallery/application/moments-admin.service";
import { serverEnv } from "@core/config/env.server";

export const metadata = { title: "Admin Moments" };

export default async function AdminMomentsPage() {
  const [decks, reels] = serverEnv.databaseUrl
    ? await Promise.all([listFeaturedDecksAdmin(), listReelsAdmin()])
    : [[], []];

  return <AdminMomentsPanel initialDecks={decks} initialReels={reels} />;
}
