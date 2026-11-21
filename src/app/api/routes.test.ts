import { resetDb, SCHEDULE_ID } from "@tests/helpers/db";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as getEmployees } from "./employees/route";
import { POST as publish } from "./schedules/[id]/publish/route";
import { GET as getSchedule } from "./schedules/[id]/route";
import { GET as getShifts, PUT as putShifts } from "./schedules/[id]/shifts/route";
import { GET as getTemplates } from "./templates/route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const url = (path: string) => `http://localhost/api${path}`;
const SHIFT = { employeeId: "emp-1", date: "2026-11-17", start: "10:00", end: "18:00", templateId: "tpl-day" };

function put(id: string, body: unknown) {
  return putShifts(
    new Request(url(`/schedules/${id}/shifts`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    ctx(id)
  );
}

const shiftsOf = (id: string, from: string, to: string) =>
  getShifts(new Request(url(`/schedules/${id}/shifts?from=${from}&to=${to}`)), ctx(id));

beforeEach(resetDb);

describe("GET /api/employees", () => {
  it("отдаёт сотрудников", async () => {
    const response = await getEmployees();
    expect(response.status).toBe(200);
    const body: { id: string }[] = await response.json();
    expect(body.map(employee => employee.id)).toEqual(["emp-1", "emp-2"]);
  });
});

describe("GET /api/templates", () => {
  it("отдаёт три шаблона", async () => {
    const response = await getTemplates();
    expect(response.status).toBe(200);
    const body: { name: string }[] = await response.json();
    expect(body.map(template => template.name)).toEqual(["Утро", "День", "Вечер"]);
  });
});

describe("GET /api/schedules/:id", () => {
  it("отдаёт график", async () => {
    const response = await getSchedule(new Request(url(`/schedules/${SCHEDULE_ID}`)), ctx(SCHEDULE_ID));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: SCHEDULE_ID, status: "draft" });
  });

  it("404 для несуществующего графика", async () => {
    const response = await getSchedule(new Request(url("/schedules/nope")), ctx("nope"));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "График не найден" });
  });
});

describe("GET /api/schedules/:id/shifts", () => {
  it("отдаёт смены периода", async () => {
    await put(SCHEDULE_ID, { upserts: [SHIFT, { ...SHIFT, date: "2026-12-01" }], deletes: [] });
    const response = await shiftsOf(SCHEDULE_ID, "2026-11-16", "2026-11-22");
    expect(response.status).toBe(200);
    const body: { date: string }[] = await response.json();
    expect(body.map(shift => shift.date)).toEqual(["2026-11-17"]);
  });

  it("400 без параметров периода", async () => {
    const response = await getShifts(new Request(url(`/schedules/${SCHEDULE_ID}/shifts`)), ctx(SCHEDULE_ID));
    expect(response.status).toBe(400);
  });

  it("400 при кривой дате", async () => {
    const response = await shiftsOf(SCHEDULE_ID, "вчера", "2026-11-22");
    expect(response.status).toBe(400);
  });
});

describe("GET /api/schedules/:id/shifts: период", () => {
  it.each([
    ["длиннее лимита", "2026-01-01", "2026-03-04"],
    ["задом наперёд", "2026-11-22", "2026-11-16"],
    ["«за всё время»", "1900-01-01", "2999-12-31"],
  ])("400: период %s", async (_name, from, to) => {
    const response = await shiftsOf(SCHEDULE_ID, from, to);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Некорректные данные" });
  });

  it("месяц отдаётся", async () => {
    expect((await shiftsOf(SCHEDULE_ID, "2026-11-01", "2026-11-30")).status).toBe(200);
  });
});

describe("PUT /api/schedules/:id/shifts: одновременная правка", () => {
  const scheduleStamp = async () =>
    (
      (await (await getSchedule(new Request(url(`/schedules/${SCHEDULE_ID}`)), ctx(SCHEDULE_ID))).json()) as {
        updatedAt: string;
      }
    ).updatedAt;

  it("с актуальной версией — 200", async () => {
    const response = await put(SCHEDULE_ID, {
      upserts: [SHIFT],
      deletes: [],
      expectedUpdatedAt: await scheduleStamp(),
    });
    expect(response.status).toBe(200);
  });

  it("с устаревшей версией — 409, смены не записаны", async () => {
    const stale = await scheduleStamp();
    await new Promise(resolve => setTimeout(resolve, 5));
    await put(SCHEDULE_ID, { upserts: [SHIFT], deletes: [] });

    const response = await put(SCHEDULE_ID, {
      upserts: [{ ...SHIFT, employeeId: "emp-2" }],
      deletes: [],
      expectedUpdatedAt: stale,
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("изменён другим пользователем") });
    const saved: { employeeId: string }[] = await (await shiftsOf(SCHEDULE_ID, "2026-11-17", "2026-11-17")).json();
    expect(saved.map(shift => shift.employeeId)).toEqual(["emp-1"]);
  });

  it("версия в неверном формате — 400", async () => {
    const response = await put(SCHEDULE_ID, { upserts: [], deletes: [], expectedUpdatedAt: "вчера" });
    expect(response.status).toBe(400);
  });
});

describe("PUT /api/schedules/:id/shifts", () => {
  it("сохраняет diff и возвращает график", async () => {
    const response = await put(SCHEDULE_ID, { upserts: [SHIFT], deletes: [] });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: SCHEDULE_ID, status: "draft" });

    const saved: { employeeId: string }[] = await (await shiftsOf(SCHEDULE_ID, "2026-11-17", "2026-11-17")).json();
    expect(saved).toHaveLength(1);
  });

  it("удаляет смены", async () => {
    await put(SCHEDULE_ID, { upserts: [SHIFT], deletes: [] });
    await put(SCHEDULE_ID, { upserts: [], deletes: [{ employeeId: "emp-1", date: "2026-11-17" }] });
    const saved: unknown[] = await (await shiftsOf(SCHEDULE_ID, "2026-11-17", "2026-11-17")).json();
    expect(saved).toEqual([]);
  });

  it("400 на некорректное время", async () => {
    const response = await put(SCHEDULE_ID, { upserts: [{ ...SHIFT, start: "25:00" }], deletes: [] });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Некорректные данные" });
  });

  it("400 на битый JSON, а не 500", async () => {
    const response = await put(SCHEDULE_ID, "{ это не json");
    expect(response.status).toBe(400);
  });

  it("400 на неизвестного сотрудника", async () => {
    const response = await put(SCHEDULE_ID, { upserts: [{ ...SHIFT, employeeId: "нет" }], deletes: [] });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Сотрудник, шаблон или график не найден" });
  });

  it("400 на неизвестный график", async () => {
    const response = await put("нет-графика", { upserts: [SHIFT], deletes: [] });
    expect(response.status).toBe(400);
  });
});

describe("POST /api/schedules/:id/publish", () => {
  it("публикует график", async () => {
    const response = await publish(
      new Request(url(`/schedules/${SCHEDULE_ID}/publish`), { method: "POST" }),
      ctx(SCHEDULE_ID)
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "published" });
  });

  it("правка после публикации возвращает график в черновик", async () => {
    await publish(new Request(url(`/schedules/${SCHEDULE_ID}/publish`), { method: "POST" }), ctx(SCHEDULE_ID));
    const response = await put(SCHEDULE_ID, { upserts: [SHIFT], deletes: [] });
    expect(await response.json()).toMatchObject({ status: "draft", publishedAt: null });
  });

  it("400 для несуществующего графика", async () => {
    const response = await publish(new Request(url("/schedules/nope/publish"), { method: "POST" }), ctx("nope"));
    expect(response.status).toBe(400);
  });
});
