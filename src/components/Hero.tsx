import { getHeroCupStatus, getTournamentDetail } from "@tournaments-leagues/index";
import { resolveEffectivePublicAuction } from "@tournaments-leagues/domain/auction-hero-phase";
import HeroCupStatusBanner from "@/components/HeroCupStatusBanner";
import SplitText from "./SplitText";
import { getSession } from "@core/auth/session";
import { requireAdmin } from "@core/auth/require-admin";
import { tryAuctionLink } from "@/lib/auction-link";

// Same gating rules as the tournament detail page's "Enter Live Auction" button
// (admin.ok, or a registered+eligible user when the admin has made the auction public).
async function resolveHeroAuctionHref(slug: string): Promise<string | null> {
  const session = await getSession();
  const userId = session?.user?.id;
  const [tournament, admin] = await Promise.all([getTournamentDetail(slug, userId), requireAdmin()]);
  if (!tournament) return null;

  const publicAuction = resolveEffectivePublicAuction(tournament.publicAuction ?? false, tournament);

  const auctionEligible =
    tournament.registrationFormat === "AUCTION" &&
    !!userId;
  const showEnterButton = tournament.registrationFormat === "AUCTION" && (admin.ok || (auctionEligible && publicAuction));
  if (!showEnterButton || !userId) return null;

  const auctionView = admin.ok
    ? "auctioneer"
    : tournament.userParticipantRole === "CAPTAIN" || tournament.userParticipantRole === "CO_CAPTAIN"
      ? "captain"
      : "observe";
  return tryAuctionLink(tournament.id, auctionView, userId);
}

export default async function Hero() {
  const heroCup = await getHeroCupStatus();
  const auctionHref = heroCup?.phase === "auction_live" ? await resolveHeroAuctionHref(heroCup.slug) : null;
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden"
    >
      {/* Static aurora-style gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 22% 28%, rgba(124,58,237,0.45), transparent 60%), radial-gradient(55% 45% at 78% 72%, rgba(34,211,238,0.32), transparent 60%), radial-gradient(40% 35% at 50% 100%, rgba(168,85,247,0.28), transparent 65%)",
        }}
      />

      {/* Grid + bottom vignette */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[var(--color-ink)] to-transparent" />
      </div>

      {/* Watermark */}
      <span
        aria-hidden
        className="text-outline pointer-events-none absolute left-1/2 top-[42.7%] sm:top-[48.5%] z-0 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[25.6vw] font-black leading-none tracking-[-0.06em] sm:text-[20.8vw] md:text-[19.2vw]"
      >
        NTG
      </span>

      {/* Registration Status Banner — shown above watermark on all viewports */}
      {heroCup ? (
        <div
          className="absolute inset-x-0 z-10 -translate-y-full flex flex-col items-center px-6 text-center"
          style={{ top: "var(--hero-content-bottom-above)" }}
        >
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
            <HeroCupStatusBanner cup={heroCup} auctionHref={auctionHref} />
          </div>
        </div>
      ) : null}

      {/* Heading Container (Centered at Watermark) */}
      <div className="absolute inset-x-0 top-[42.7%] sm:top-[48.5%] z-10 -translate-y-1/2 flex flex-col items-center px-6 text-center">
        <h1 className="font-display font-semibold uppercase text-white">
          <span className="block leading-[0.96] tracking-[-0.025em]" style={{ fontSize: "var(--text-hero)" }}>
            <SplitText text="Namma Tulunad" delay={0} stagger={25} duration={680} />
          </span>

          {/* Line 2 — SplitText with brand gradient, delayed to sequence after line 1 */}
          <span className="mt-2 block leading-[0.96] tracking-[-0.025em]" style={{ fontSize: "var(--text-hero)" }}>
            <SplitText text="Gaming" delay={380} stagger={35} duration={680} charClassName="text-gradient-brand" />
          </span>
        </h1>
      </div>

      <div
        className="absolute inset-x-0 z-10 flex flex-col items-center gap-3 sm:gap-8 px-6 text-center"
        style={{ top: "var(--hero-content-top)" }}
      >
        <p
          className="leading-relaxed text-white/55"
          style={{
            fontSize: "clamp(0.68rem, 2.6vw, 1.3rem)",
            maxWidth: "clamp(14.4rem, 64vw, 54.4rem)",
          }}
        >
          Mangaluru&apos;s premier esports lounge — premium hardware, electric
          <span className="hidden sm:inline"><br /></span>
          <span className="sm:hidden"> </span>
          atmosphere, engineered for the players who set the standard.
        </p>
      </div>
    </section>
  );
}
