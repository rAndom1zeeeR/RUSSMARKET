import type { PrismaClient } from "../generated/prisma/client";
import { databaseProvider } from "../../prisma/database-url";

/**
 * Клиент Prisma под базу из URL. Генерируются оба клиента (SQLite и Postgres), выбирает рантайм,
 * поэтому нельзя запустить клиент одного провайдера против базы другого.
 * Импорты динамические: в проде не грузится нативный `better-sqlite3`, в разработке — `pg`.
 *
 * Тип — клиент SQLite: схемы моделей у провайдеров совпадают (это проверяет `prisma/schemas.test.ts`),
 * поэтому код репозиториев одинаков для обоих.
 */
export async function createPrismaClient(url: string): Promise<PrismaClient> {
  if (databaseProvider(url) === "postgres") {
    const [{ PrismaClient: PostgresClient }, { PrismaPg }] = await Promise.all([
      import("../generated/prisma-postgres/client"),
      import("@prisma/adapter-pg"),
    ]);
    const client = new PostgresClient({ adapter: new PrismaPg({ connectionString: url }) });
    // Модели одинаковые, различаются только внутренние типы провайдера.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return client as unknown as PrismaClient;
  }

  const [{ PrismaClient: SqliteClient }, { PrismaBetterSqlite3 }] = await Promise.all([
    import("../generated/prisma/client"),
    import("@prisma/adapter-better-sqlite3"),
  ]);
  return new SqliteClient({ adapter: new PrismaBetterSqlite3({ url }) });
}
