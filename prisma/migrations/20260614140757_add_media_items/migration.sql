-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('BOOK', 'MOVIE', 'TV');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('WISHLIST', 'DOING', 'DONE', 'DROPPED');

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "creator" TEXT,
    "year" INTEGER,
    "coverUrl" TEXT,
    "doubanId" TEXT,
    "tmdbId" TEXT,
    "isbn" TEXT,
    "status" "MediaStatus" NOT NULL DEFAULT 'WISHLIST',
    "rating" INTEGER,
    "startedAt" DATE,
    "finishedAt" DATE,
    "releaseDate" DATE,
    "reviewMd" TEXT,
    "hasSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaItem_doubanId_key" ON "MediaItem"("doubanId");
