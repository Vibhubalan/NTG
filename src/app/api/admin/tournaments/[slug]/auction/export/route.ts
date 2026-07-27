import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { exportAuctionCsv } from "@/modules/auction/application/roster-publish.service";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug } = await params;
  const csv = await exportAuctionCsv(slug);
  if (!csv) {
    return new Response("No auction data", { status: 404 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-auction.csv"`,
    },
  });
}
