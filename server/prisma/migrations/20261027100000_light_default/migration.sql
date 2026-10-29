-- Light is the default look. Accounts that were only on the old "system" default move to light.
ALTER TABLE "UserPreferences" ALTER COLUMN "theme" SET DEFAULT 'light';
UPDATE "UserPreferences" SET "theme" = 'light' WHERE "theme" = 'system';
