import { redirect } from "next/navigation";

/** Esports hub removed — competitive surfaces live under NTG Lounge nav. */
export default function EsportsHubPage() {
  redirect("/esports/tournaments");
}
