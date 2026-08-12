-- Enable RLS on every public base table that still has it off.
-- Skips _prisma_migrations (Prisma owns that). No policies = deny-all for anon/authenticated.
-- Prisma postgres role continues to bypass RLS as table owner.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
      AND c.relname <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.table_name);
  END LOOP;
END $$;
