-- Clear Supabase Advisor: RLS Disabled on public._prisma_migrations.
-- No policies = deny-all for anon/authenticated. Prisma (postgres owner) still bypasses RLS.

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
