ALTER TABLE "User"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "resetTokenHash" TEXT,
  ADD COLUMN "resetExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_resetTokenHash_key" ON "User"("resetTokenHash");
