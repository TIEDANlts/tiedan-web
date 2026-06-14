-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WISHLIST', 'BACKLOG', 'PLAYING', 'FINISHED', 'SHELVED');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "steamAppId" INTEGER,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "coverUrl" TEXT,
    "status" "GameStatus" NOT NULL DEFAULT 'BACKLOG',
    "rating" INTEGER,
    "playtimeMin" INTEGER NOT NULL DEFAULT 0,
    "playtime2w" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" TIMESTAMP(3),
    "reviewMd" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_steamAppId_key" ON "Game"("steamAppId");
