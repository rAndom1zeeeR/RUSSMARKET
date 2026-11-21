import "server-only";
import { prisma } from "@/server/db";

/** Проверка, что база отвечает: один дешёвый запрос без чтения данных. Бросает, если базы нет. */
export async function pingDatabase(): Promise<void> {
  await prisma.schedule.findFirst({ select: { id: true } });
}
