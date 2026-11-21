import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";
import { resetDb, SCHEDULE_ID } from "../../../tests/helpers/db";
import { GET as getEmployees } from "./employees/route";
import { POST as publish } from "./schedules/[id]/publish/route";
import { GET as getSchedule } from "./schedules/[id]/route";
import { GET as getShifts } from "./schedules/[id]/shifts/route";
import { GET as getTemplates } from "./templates/route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const DB_DOWN = new Error("no such table: main.Employee");
const DB_HINT = { error: "База данных не готова. Выполните `pnpm db:setup`." };

beforeEach(resetDb);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Route Handlers при недоступной БД", () => {
  it("GET /api/employees → 500 с подсказкой", async () => {
    vi.spyOn(prisma.employee, "findMany").mockRejectedValueOnce(DB_DOWN);
    const response = await getEmployees();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(DB_HINT);
  });

  it("GET /api/templates → 500 с подсказкой", async () => {
    vi.spyOn(prisma.shiftTemplate, "findMany").mockRejectedValueOnce(DB_DOWN);
    const response = await getTemplates();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(DB_HINT);
  });

  it("GET /api/schedules/:id → 500 с подсказкой", async () => {
    vi.spyOn(prisma.schedule, "findUnique").mockRejectedValueOnce(DB_DOWN);
    const response = await getSchedule(new Request("http://localhost/api/schedules/x"), ctx(SCHEDULE_ID));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(DB_HINT);
  });

  it("GET /api/schedules/:id/shifts → 500 с подсказкой", async () => {
    vi.spyOn(prisma.shift, "findMany").mockRejectedValueOnce(DB_DOWN);
    const response = await getShifts(
      new Request("http://localhost/api/schedules/x/shifts?from=2026-11-16&to=2026-11-22"),
      ctx(SCHEDULE_ID)
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(DB_HINT);
  });

  it("POST /api/schedules/:id/publish → 500 без утечки деталей при неожиданной ошибке", async () => {
    vi.spyOn(prisma.schedule, "update").mockRejectedValueOnce(new Error("внутренняя деталь"));
    const response = await publish(
      new Request("http://localhost/api/schedules/x/publish", { method: "POST" }),
      ctx(SCHEDULE_ID)
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Внутренняя ошибка сервера" });
  });
});
