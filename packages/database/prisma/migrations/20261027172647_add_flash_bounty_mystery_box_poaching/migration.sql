-- CreateEnum
CREATE TYPE "FlashBountyStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MysteryBoxStatus" AS ENUM ('PENDING', 'PARTIALLY_CLAIMED', 'CLAIMED', 'DESTROYED');

-- CreateEnum
CREATE TYPE "PoachEventStatus" AS ENUM ('ALERTING', 'CLAIMED', 'EXPIRED');

-- AlterTable
ALTER TABLE "campaign_participants" ADD COLUMN     "inactivityAlertedAt" TIMESTAMP(3),
ADD COLUMN     "lastActiveAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "referral_invite_links" ADD COLUMN     "approvedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pendingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requiresJoinRequest" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "flash_bounties" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "campaignId" TEXT,
    "startedBy" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "inviteCount" INTEGER NOT NULL DEFAULT 0,
    "status" "FlashBountyStatus" NOT NULL DEFAULT 'ACTIVE',
    "telegramMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flash_bounties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mystery_boxes" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "rewardDescription" TEXT NOT NULL,
    "inviterClaimedAt" TIMESTAMP(3),
    "inviteeClaimedAt" TIMESTAMP(3),
    "destroyedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "MysteryBoxStatus" NOT NULL DEFAULT 'PENDING',
    "telegramMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mystery_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poach_events" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subjectTelegramId" TEXT NOT NULL,
    "originalReferrerId" TEXT NOT NULL,
    "poacherId" TEXT,
    "alertMessageId" TEXT,
    "alertSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poachClaimedAt" TIMESTAMP(3),
    "pointsTransferred" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "PoachEventStatus" NOT NULL DEFAULT 'ALERTING',

    CONSTRAINT "poach_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flash_bounties_groupId_status_idx" ON "flash_bounties"("groupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mystery_boxes_referralId_key" ON "mystery_boxes"("referralId");

-- CreateIndex
CREATE INDEX "mystery_boxes_groupId_status_idx" ON "mystery_boxes"("groupId", "status");

-- CreateIndex
CREATE INDEX "poach_events_groupId_status_idx" ON "poach_events"("groupId", "status");

-- CreateIndex
CREATE INDEX "poach_events_campaignId_subjectTelegramId_idx" ON "poach_events"("campaignId", "subjectTelegramId");

-- AddForeignKey
ALTER TABLE "flash_bounties" ADD CONSTRAINT "flash_bounties_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "telegram_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_bounties" ADD CONSTRAINT "flash_bounties_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mystery_boxes" ADD CONSTRAINT "mystery_boxes_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mystery_boxes" ADD CONSTRAINT "mystery_boxes_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "telegram_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mystery_boxes" ADD CONSTRAINT "mystery_boxes_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poach_events" ADD CONSTRAINT "poach_events_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "telegram_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poach_events" ADD CONSTRAINT "poach_events_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
