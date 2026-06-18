import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="relative flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 pb-16 pt-40 sm:px-10 lg:px-14">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--color-brand)]/85">
          Legal
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">Privacy</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/55">
          NTG Lounge (&quot;we&quot;) runs membership, tournaments, and rankings for players at our
          Mangaluru lounge. This page explains what we collect and your choices.
        </p>

        <section className="mt-10 space-y-6 text-sm leading-relaxed text-white/65">
          <div>
            <h2 className="font-semibold text-white">What we collect</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Account: name, email, phone, date of birth, Olympus ID</li>
              <li>Game links: Riot ID, Steam profile (when you connect them)</li>
              <li>Tournament registrations and uploaded team assets you provide</li>
              <li>Competitive rank snapshots for the public town leaderboard</li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-white">Why we use it</h2>
            <p className="mt-2">
              To operate cups, verify eligibility, display rankings, contact you about events, and
              keep the platform secure.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-white">Retention & deletion</h2>
            <p className="mt-2">
              We keep data while your account is active. You can delete your account from{" "}
              <Link href="/profile" className="text-[var(--color-brand)] hover:underline">
                Profile
              </Link>{" "}
              for integrity (e.g. anonymised registration history).
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-white">Tournaments & Decisions</h2>
            <p className="mt-2">
              For all tournaments hosted by organizers on our platform, participants must follow all official guidelines and rules. Rules are subject to change at the sole discretion of the organizers, and organizers hold the final decision-making authority in all matters.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-white">Contact</h2>
            <p className="mt-2">
              Questions or data requests: reach us via the lounge&apos;s official Instagram or in
              person at Lotus Paradise Elite, Mangaluru.
            </p>
          </div>
        </section>

        <p className="mt-12 text-xs text-white/35">Last updated: June 2026</p>
      </div>
      <Footer />
    </main>
  );
}
