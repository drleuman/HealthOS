-- CreateTable
CREATE TABLE "UserBehaviorSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedDaysLast7" INTEGER NOT NULL,
    "completedDaysLast7" INTEGER NOT NULL,
    "avgCompletionDelay" INTEGER NOT NULL,
    "repeatedOpeningsToday" INTEGER NOT NULL,
    "inactive48h" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBehaviorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBehaviorState" (
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBehaviorState_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "UserBehaviorSnapshot_userId_timestamp_idx" ON "UserBehaviorSnapshot"("userId", "timestamp");

-- AddForeignKey
ALTER TABLE "UserBehaviorSnapshot" ADD CONSTRAINT "UserBehaviorSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBehaviorState" ADD CONSTRAINT "UserBehaviorState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
