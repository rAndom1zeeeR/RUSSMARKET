-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'агент',
    "monthlyHours" INTEGER NOT NULL DEFAULT 24,
    "avatarUrl" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Employee" ("avatarUrl", "fullName", "id", "monthlyHours", "role", "sort") SELECT "avatarUrl", "fullName", "id", "monthlyHours", "role", "sort" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
