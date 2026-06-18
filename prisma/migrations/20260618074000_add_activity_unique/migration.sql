DELETE FROM "Activity" a
USING "Activity" b
WHERE a."module" = b."module"
  AND a."action" = b."action"
  AND a."refId" = b."refId"
  AND (
    a."happenedAt" > b."happenedAt"
    OR (a."happenedAt" = b."happenedAt" AND a."id" > b."id")
  );

CREATE UNIQUE INDEX "Activity_module_action_refId_key" ON "Activity"("module", "action", "refId");
