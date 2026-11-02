-- Notifications disappear after a number of days (2 by default).
ALTER TABLE "Notification" ADD COLUMN "expiresAt" TIMESTAMP(3);
CREATE INDEX "Notification_expiresAt_idx" ON "Notification"("expiresAt");

-- Each person can choose how long their notifications stay (empty = the standard 2 days, 0 = keep).
ALTER TABLE "UserPreferences" ADD COLUMN "notificationDays" INTEGER;

-- Remember how long each announcement was set to stay.
ALTER TABLE "Broadcast" ADD COLUMN "expiresInDays" INTEGER;

-- Messages that already exist follow the standard: they go 2 days after they were created.
UPDATE "Notification" SET "expiresAt" = "createdAt" + INTERVAL '2 days' WHERE "expiresAt" IS NULL;
