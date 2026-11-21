import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return json({ error: "Некорректные данные", issues: error.issues }, 400);
  }
  const message = error instanceof Error ? error.message : "Неизвестная ошибка";
  if (/no such table|unable to open|SQLITE_CANTOPEN/i.test(message)) {
    return json({ error: "База данных не готова. Выполните `pnpm db:setup`." }, 500);
  }
  if (/Foreign key|P2003|P2025/i.test(message)) {
    return json({ error: "Сотрудник, шаблон или график не найден" }, 400);
  }
  return json({ error: "Внутренняя ошибка сервера" }, 500);
}
