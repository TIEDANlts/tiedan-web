-- The previous recovery migration trims legacy JSON names before re-inserting
-- missed rows. If the first TripLocation migration had already inserted the
-- same location with leading/trailing whitespace, remove the recovered
-- duplicate and normalize the retained row's display name.
WITH duplicate_recovered AS (
    SELECT recovered."id"
    FROM "TripLocation" recovered
    WHERE recovered."id" LIKE 'legacy-migrated-%'
      AND EXISTS (
          SELECT 1
          FROM "TripLocation" existing
          WHERE existing."id" <> recovered."id"
            AND existing."id" NOT LIKE 'legacy-migrated-%'
            AND existing."dayId" = recovered."dayId"
            AND existing."sort" = recovered."sort"
            AND existing."lat" = recovered."lat"
            AND existing."lng" = recovered."lng"
            AND btrim(existing."name") = recovered."name"
      )
)
DELETE FROM "TripLocation" location
USING duplicate_recovered duplicate
WHERE location."id" = duplicate."id";

UPDATE "TripLocation"
SET "name" = btrim("name")
WHERE "name" <> btrim("name");
