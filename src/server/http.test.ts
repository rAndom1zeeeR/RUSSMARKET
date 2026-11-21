import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorResponse, json } from "./http";

async function read(response: Response): Promise<unknown> {
  return response.json();
}

describe("json", () => {
  it("отдаёт данные со статусом 200 по умолчанию", async () => {
    const response = json({ ok: true });
    expect(response.status).toBe(200);
    expect(await read(response)).toEqual({ ok: true });
  });

  it("принимает свой статус", () => {
    expect(json({}, 404).status).toBe(404);
  });
});

describe("errorResponse", () => {
  it("ошибка валидации zod → 400 со списком проблем", async () => {
    const parsed = z.object({ time: z.string().regex(/^\d\d:\d\d$/) }).safeParse({ time: "x" });
    if (parsed.success) throw new Error("ожидалась ошибка валидации");

    const response = errorResponse(parsed.error);
    expect(response.status).toBe(400);
    const body = await read(response);
    expect(body).toMatchObject({ error: "Некорректные данные" });
    expect(body).toHaveProperty("issues");
  });

  it("битый JSON в теле → 400", async () => {
    const response = errorResponse(new SyntaxError("Unexpected token"));
    expect(response.status).toBe(400);
    expect(await read(response)).toEqual({ error: "Некорректный JSON в теле запроса" });
  });

  it.each([
    "no such table: Employee",
    "unable to open database file",
    "SQLITE_CANTOPEN: cannot open",
    'relation "Employee" does not exist',
    "connect ECONNREFUSED 127.0.0.1:5432",
    "getaddrinfo ENOTFOUND db.internal",
    "Can't reach database server at db:5432",
  ])("БД не готова («%s») → 500 с подсказкой", async message => {
    const response = errorResponse(new Error(message));
    expect(response.status).toBe(500);
    expect(await read(response)).toEqual({ error: "База данных не готова. Выполните `pnpm db:setup`." });
  });

  it.each(["Foreign key constraint violated", "Invalid prisma call P2003", "Record not found P2025"])(
    "нарушение связей («%s») → 400",
    async message => {
      const response = errorResponse(new Error(message));
      expect(response.status).toBe(400);
      expect(await read(response)).toEqual({ error: "Сотрудник, шаблон или график не найден" });
    }
  );

  it.each(["P1001", "P1002", "P1017", "P2021"])(
    "ошибка Prisma с кодом %s (Postgres недоступен или без таблиц) → подсказка",
    async code => {
      const response = errorResponse(Object.assign(new Error("driver error"), { code }));
      expect(response.status).toBe(500);
      expect(await read(response)).toEqual({ error: "База данных не готова. Выполните `pnpm db:setup`." });
    }
  );

  it("ошибка Prisma с кодом P2025/P2003 → 400, даже если код не в тексте", async () => {
    const error = Object.assign(new Error("No record was found for an update."), { code: "P2025" });
    expect(errorResponse(error).status).toBe(400);
  });

  it("прочее → 500 без утечки внутреннего текста", async () => {
    const response = errorResponse(new Error("секретная деталь реализации"));
    expect(response.status).toBe(500);
    expect(await read(response)).toEqual({ error: "Внутренняя ошибка сервера" });
  });

  it("не Error (строка, null) → 500", async () => {
    expect(errorResponse("boom").status).toBe(500);
    expect(errorResponse(null).status).toBe(500);
  });
});
