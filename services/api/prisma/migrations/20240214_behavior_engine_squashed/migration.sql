-- Squash migration for Behavior Engine

-- CreateTable: UserBehaviorSnapshot
CREATE TABLE "UserBehaviorSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startedDaysLast7" INTEGER NOT NULL,
    "completedDaysLast7" INTEGER NOT NULL,
    "repeatedOpeningsSameDay" INTEGER NOT NULL,
    "inactive48h" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBehaviorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserBehaviorState
CREATE TABLE "UserBehaviorState" (
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBehaviorState_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "UserBehaviorSnapshot_userId_date_idx" ON "UserBehaviorSnapshot"("userId", "date");
CREATE UNIQUE INDEX "UserBehaviorSnapshot_userId_date_key" ON "UserBehaviorSnapshot"("userId", "date");

-- AddForeignKey
ALTER TABLE "UserBehaviorSnapshot" ADD CONSTRAINT "UserBehaviorSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBehaviorState" ADD CONSTRAINT "UserBehaviorState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
