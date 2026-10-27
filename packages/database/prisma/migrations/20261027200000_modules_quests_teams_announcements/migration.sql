-- Add campaign relation and type to announcements
ALTER TABLE "announcements" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "announcements" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'BROADCAST';

-- Add region to teams
ALTER TABLE "teams" ADD COLUMN "region" TEXT;

-- Add FK: teams.campaignId → campaigns.id
ALTER TABLE "teams" ADD CONSTRAINT "teams_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add FK: team_memberships.participantId → campaign_participants.id
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "campaign_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add FK: announcements.campaignId → campaigns.id
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable badges
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '🏆',
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable quests
CREATE TABLE "quests" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "campaignId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MANUAL',
    "target" INTEGER NOT NULL DEFAULT 1,
    "points" INTEGER NOT NULL DEFAULT 10,
    "badgeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable quest_completions
CREATE TABLE "quest_completions" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quest_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable user_badges
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "quest_completions_questId_participantId_key" ON "quest_completions"("questId", "participantId");
CREATE UNIQUE INDEX "user_badges_badgeId_participantId_key" ON "user_badges"("badgeId", "participantId");

-- AddForeignKey badges
ALTER TABLE "badges" ADD CONSTRAINT "badges_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "telegram_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey quests
ALTER TABLE "quests" ADD CONSTRAINT "quests_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "telegram_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quests" ADD CONSTRAINT "quests_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quests" ADD CONSTRAINT "quests_badgeId_fkey"
  FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey quest_completions
ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_questId_fkey"
  FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "campaign_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey user_badges
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey"
  FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "campaign_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
