import "server-only";
import { prisma } from "@/server/db";
import { databaseProvider, DEFAULT_DATABASE_URL, type DatabaseProvider } from "../../../prisma/database-url";

/** Проверка, что база отвечает: один дешёвый запрос без чтения данных. Бросает, если базы нет. */
export async function pingDatabase(): Promise<void> {
  await prisma.schedule.findFirst({ select: { id: true } });
}

export interface DatabaseStatus {
  provider: DatabaseProvider;
  connected: boolean;
}

/**
 * Какая база выбрана сейчас и отвечает ли она.
 * В результат не попадают хост и пароль из `DATABASE_URL`.
 */
export async function databaseStatus(): Promise<DatabaseStatus> {
  const provider = databaseProvider(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL);
  try {
    await pingDatabase();
    return { provider, connected: true };
  } catch {
    return { provider, connected: false };
  }
}
