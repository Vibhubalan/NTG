-- Drop unused Time-limited QA and Moments admin tables (features removed from app).

DROP TABLE IF EXISTS "TimeLimitedQaResponse" CASCADE;
DROP TABLE IF EXISTS "TimeLimitedQaFormField" CASCADE;
DROP TABLE IF EXISTS "TimeLimitedQaCampaign" CASCADE;

DROP TABLE IF EXISTS "MomentsFeaturedImage" CASCADE;
DROP TABLE IF EXISTS "MomentsFeaturedDeck" CASCADE;
DROP TABLE IF EXISTS "SocialReelPost" CASCADE;

DROP TYPE IF EXISTS "MomentsDisplayMode";

DELETE FROM "PlatformSetting" WHERE key = 'time_limited_qa_enabled';
