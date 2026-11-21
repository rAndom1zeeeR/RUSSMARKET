import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/** Код ошибки Prisma, если он есть (P2003 — нарушение связи, P2025 — запись не найдена). */
function prismaCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return null;
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return json({ error: "Некорректные данные", issues: error.issues }, 400);
  }
  // `request.json()` бросает SyntaxError на битом теле — это ошибка клиента, а не сервера.
  if (error instanceof SyntaxError) {
    return json({ error: "Некорректный JSON в теле запроса" }, 400);
  }
  const message = error instanceof Error ? error.message : "Неизвестная ошибка";
  const code = prismaCode(error);
  // База недоступна или без таблиц: SQLite («no such table», файл не открылся) и Postgres
  // (P1001 — не достучаться, P2021 — таблицы нет, `relation "…" does not exist`).
  const notReadyCodes = ["P1001", "P1002", "P1017", "P2021"];
  if (
    (code !== null && notReadyCodes.includes(code)) ||
    /no such table|unable to open|SQLITE_CANTOPEN|relation "[^"]+" does not exist|ECONNREFUSED|ENOTFOUND|Can.t reach database/i.test(
      message
    )
  ) {
    return json({ error: "База данных не готова. Выполните `pnpm db:setup`." }, 500);
  }
  if (code === "P2003" || code === "P2025" || /Foreign key|P2003|P2025/i.test(message)) {
    return json({ error: "Сотрудник, шаблон или график не найден" }, 400);
  }
  return json({ error: "Внутренняя ошибка сервера" }, 500);
}
