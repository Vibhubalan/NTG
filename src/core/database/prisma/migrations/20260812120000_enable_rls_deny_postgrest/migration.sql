-- Lock down Supabase PostgREST (anon/authenticated) while Prisma (postgres)
-- continues to bypass RLS as table owner.
-- No permissive policies = deny-all via the REST API.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User',
    'EmailOtp',
    'PendingSignup',
    'Account',
    'Session',
    'VerificationToken',
    'PlayerProfile',
    'GameIdentity',
    'Season',
    'Tournament',
    'TournamentTeam',
    'TournamentTeamPlayer',
    'TournamentGame',
    'TournamentGamePlayer',
    'TournamentRegistration',
    'Bracket',
    'Match',
    'MatchParticipant',
    'MatchResult',
    'TournamentPlacement',
    'PlayerBadge',
    'LeaderboardEntry',
    'LeaderboardRefreshRun',
    'LeaderboardRankAuditLog',
    'AdminAuditLog',
    'UserActivityLog',
    'PlatformSetting',
    'GamepassPlan',
    'HostOffering',
    'SponsorLogo',
    'RosterTeam',
    'RosterPlayer',
    'Listing',
    'ListingFormField',
    'ListingApplication'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
