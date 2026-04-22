-- Per-user toggle: when true (default), reconcileStreakFreezes() spends
-- a freeze automatically on yesterday's miss. When false, freezes
-- accrue as inventory and the user burns them manually from the
-- streak calendar.
ALTER TABLE "UserProfile"
  ADD COLUMN "autoFreezeStreak" BOOLEAN NOT NULL DEFAULT true;
