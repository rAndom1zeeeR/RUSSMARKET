import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";
import { DEFAULT_DATABASE_URL, PROVIDER_PATHS, databaseProvider } from "./prisma/database-url";

if (existsSync(".env")) process.loadEnvFile(".env");

// Какая база — решает DATABASE_URL: от него зависят схема и каталог миграций.
const url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
const paths = PROVIDER_PATHS[databaseProvider(url)];

export default defineConfig({
  schema: paths.schema,
  migrations: {
    path: paths.migrations,
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url },
});
