-- Emails were stored as typed, so "Ada@Example.org" and "ada@example.org" were two accounts and
-- neither login nor lab invitations matched across the variants. Normalise to trimmed lowercase.
-- On a collision the oldest row by createdAt wins and the newer duplicates are removed (their
-- dependent rows cascade); with seeded development data there are none.
DELETE FROM "User" u
USING "User" keeper
WHERE lower(btrim(u."email")) = lower(btrim(keeper."email"))
  AND u."id" <> keeper."id"
  AND (keeper."createdAt", keeper."id") < (u."createdAt", u."id");

UPDATE "User" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));
