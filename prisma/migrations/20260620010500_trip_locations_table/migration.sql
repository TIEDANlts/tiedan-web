-- CreateTable
CREATE TABLE "TripLocation" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripLocation_dayId_idx" ON "TripLocation"("dayId");

-- AddForeignKey
ALTER TABLE "TripLocation" ADD CONSTRAINT "TripLocation_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "TripDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate valid legacy TripDay.locations JSON entries into row-based locations.
INSERT INTO "TripLocation" ("id", "dayId", "name", "lat", "lng", "sort", "createdAt")
SELECT
    COALESCE(NULLIF(item->>'id', ''), 'legacy-' || td."id" || '-' || ordinality::text),
    td."id",
    item->>'name',
    (item->>'lat')::numeric(9,6),
    (item->>'lng')::numeric(9,6),
    ordinality::int - 1,
    CURRENT_TIMESTAMP
FROM "TripDay" td
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(td."locations") = 'array' THEN td."locations" ELSE '[]'::jsonb END
) WITH ORDINALITY AS loc(item, ordinality)
WHERE item ? 'name'
  AND item ? 'lat'
  AND item ? 'lng'
  AND NULLIF(item->>'name', '') IS NOT NULL
  AND (item->>'lat') ~ '^-?[0-9]+(\.[0-9]+)?$'
  AND (item->>'lng') ~ '^-?[0-9]+(\.[0-9]+)?$'
  AND (item->>'lat')::numeric BETWEEN -90 AND 90
  AND (item->>'lng')::numeric BETWEEN -180 AND 180
ON CONFLICT ("id") DO NOTHING;
