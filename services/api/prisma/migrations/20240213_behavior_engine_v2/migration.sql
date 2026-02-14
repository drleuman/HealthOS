-- AlterTable
ALTER TABLE "UserBehaviorSnapshot" DROP COLUMN "timestamp",
DROP COLUMN "avgCompletionDelay",
DROP COLUMN "repeatedOpeningsToday",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "repeatedOpeningsSameDay" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "UserBehaviorState" DROP COLUMN "updatedAt",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserBehaviorSnapshot_userId_date_key" ON "UserBehaviorSnapshot"("userId", "date");

-- CreateIndex
CREATE INDEX "UserBehaviorSnapshot_userId_date_idx" ON "UserBehaviorSnapshot"("userId", "date");
