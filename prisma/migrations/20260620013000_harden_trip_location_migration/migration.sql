-- Recover valid legacy locations that may have been skipped by duplicate JSON ids
-- in the first TripLocation migration, then let the table own coordinate bounds.
WITH legacy_items AS (
    SELECT
        td."id" AS "dayId",
        loc.item,
        loc.ordinality
    FROM "TripDay" td
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(td."locations") = 'array' THEN td."locations" ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS loc(item, ordinality)
),
normalized_locations AS (
    SELECT
        "dayId",
        NULLIF(btrim(item->>'name'), '') AS "name",
        btrim(item->>'lat') AS "latText",
        btrim(item->>'lng') AS "lngText",
        ordinality::int - 1 AS "sort"
    FROM legacy_items
    WHERE item ? 'name'
      AND item ? 'lat'
      AND item ? 'lng'
),
numeric_locations AS (
    SELECT
        "dayId",
        "name",
        "latText"::numeric AS "lat",
        "lngText"::numeric AS "lng",
        "sort"
    FROM normalized_locations
    WHERE "name" IS NOT NULL
      AND "latText" ~ '^[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$'
      AND "lngText" ~ '^[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$'
)
INSERT INTO "TripLocation" ("id", "dayId", "name", "lat", "lng", "sort", "createdAt")
SELECT
    'legacy-migrated-' || md5("dayId" || ':' || "sort"::text),
    "dayId",
    "name",
    "lat"::numeric(9,6),
    "lng"::numeric(9,6),
    "sort",
    CURRENT_TIMESTAMP
FROM numeric_locations legacy
WHERE "lat" BETWEEN -90 AND 90
  AND "lng" BETWEEN -180 AND 180
  AND NOT EXISTS (
      SELECT 1
      FROM "TripLocation" existing
      WHERE existing."dayId" = legacy."dayId"
        AND existing."sort" = legacy."sort"
        AND existing."name" = legacy."name"
        AND existing."lat" = legacy."lat"::numeric(9,6)
        AND existing."lng" = legacy."lng"::numeric(9,6)
  )
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "TripLocation"
ADD CONSTRAINT "TripLocation_lat_range_check" CHECK ("lat" BETWEEN -90 AND 90);

ALTER TABLE "TripLocation"
ADD CONSTRAINT "TripLocation_lng_range_check" CHECK ("lng" BETWEEN -180 AND 180);
