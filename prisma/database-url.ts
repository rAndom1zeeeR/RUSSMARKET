/**
 * Выбор базы по `DATABASE_URL`: `file:…` — локальная SQLite (разработка), `postgresql://…` — Postgres (прод).
 * Лежит в `prisma/`, а не в `src/`: его читает `prisma.config.ts`, а при сборке образа
 * (стадия установки зависимостей) копируется только каталог `prisma`.
 */
export type DatabaseProvider = "sqlite" | "postgres";

export const DEFAULT_DATABASE_URL = "file:./prisma/data/dev.db";

/** Схема, миграции и каталог клиента у каждого провайдера свои: диалекты SQL у SQLite и Postgres разные. */
export const PROVIDER_PATHS = {
  sqlite: { schema: "prisma/schema.prisma", migrations: "prisma/migrations" },
  postgres: { schema: "prisma/postgres/schema.prisma", migrations: "prisma/postgres/migrations" },
} as const;

export function databaseProvider(url: string): DatabaseProvider {
  if (url.startsWith("file:")) return "sqlite";
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) return "postgres";
  // Сам URL в сообщение не кладём: в нём может быть пароль.
  throw new Error("Неподдерживаемый DATABASE_URL: ожидается file:… (SQLite) или postgresql://… (Postgres)");
}
