-- Each person can choose the site's accent colour.
ALTER TABLE "UserPreferences" ADD COLUMN "accent" TEXT NOT NULL DEFAULT 'blue';
