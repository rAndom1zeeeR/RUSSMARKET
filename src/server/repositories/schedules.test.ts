import { resetDb, SCHEDULE_ID } from "@tests/helpers/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../db";
import { ConflictError } from "../errors";
import { getFirstScheduleId, getSchedule, listShifts, publishSchedule, saveShifts } from "./schedules";

const SHIFT = { employeeId: "emp-1", date: "2026-11-17", start: "10:00", end: "18:00", templateId: "tpl-day" };

async function seedShifts() {
  await prisma.shift.createMany({
    data: [
      { scheduleId: SCHEDULE_ID, employeeId: "emp-1", date: "2026-11-15", start: "07:00", end: "15:00" },
      { scheduleId: SCHEDULE_ID, employeeId: "emp-1", date: "2026-11-16", start: "07:00", end: "15:00" },
      { scheduleId: SCHEDULE_ID, employeeId: "emp-2", date: "2026-11-18", start: "15:00", end: "23:00" },
      { scheduleId: SCHEDULE_ID, employeeId: "emp-1", date: "2026-11-22", start: "10:00", end: "18:00" },
      { scheduleId: SCHEDULE_ID, employeeId: "emp-2", date: "2026-11-23", start: "10:00", end: "18:00" },
    ],
  });
}

const countShifts = () => prisma.shift.count();

beforeEach(resetDb);

describe("getSchedule", () => {
  it("возвращает график в виде DTO", async () => {
    const schedule = await getSchedule(SCHEDULE_ID);
    expect(schedule).toMatchObject({ id: SCHEDULE_ID, title: "График", status: "draft", publishedAt: null });
    expect(typeof schedule?.updatedAt).toBe("string");
  });

  it("для несуществующего графика — null", async () => {
    expect(await getSchedule("nope")).toBeNull();
  });

  it("неизвестный статус в БД трактуется как draft", async () => {
    await prisma.schedule.update({ where: { id: SCHEDULE_ID }, data: { status: "archived" } });
    expect((await getSchedule(SCHEDULE_ID))?.status).toBe("draft");
  });
});

describe("getFirstScheduleId", () => {
  it("возвращает id единственного графика", async () => {
    expect(await getFirstScheduleId()).toBe(SCHEDULE_ID);
  });

  it("выбирает недавно обновлённый график", async () => {
    await prisma.schedule.create({
      data: { id: "sched-2", title: "Новее", updatedAt: new Date(Date.now() + 60_000) },
    });
    expect(await getFirstScheduleId()).toBe("sched-2");
  });

  it("если графиков нет — null", async () => {
    await prisma.schedule.deleteMany();
    expect(await getFirstScheduleId()).toBeNull();
  });
});

describe("listShifts", () => {
  it("отдаёт смены периода включительно по обоим краям, по возрастанию даты", async () => {
    await seedShifts();
    const shifts = await listShifts(SCHEDULE_ID, "2026-11-16", "2026-11-22");
    expect(shifts.map(shift => shift.date)).toEqual(["2026-11-16", "2026-11-18", "2026-11-22"]);
  });

  it("DTO содержит id, сотрудника, время и шаблон", async () => {
    await seedShifts();
    const [first] = await listShifts(SCHEDULE_ID, "2026-11-16", "2026-11-16");
    expect(first).toEqual({
      id: expect.any(String),
      employeeId: "emp-1",
      date: "2026-11-16",
      start: "07:00",
      end: "15:00",
      templateId: null,
    });
  });

  it("не отдаёт смены другого графика", async () => {
    await seedShifts();
    await prisma.schedule.create({ data: { id: "sched-2", title: "Другой" } });
    expect(await listShifts("sched-2", "2026-11-01", "2026-11-30")).toEqual([]);
  });

  it("пустой период — пустой список", async () => {
    expect(await listShifts(SCHEDULE_ID, "2026-11-16", "2026-11-22")).toEqual([]);
  });
});

describe("saveShifts", () => {
  it("создаёт новую смену", async () => {
    await saveShifts(SCHEDULE_ID, { upserts: [SHIFT], deletes: [] });
    expect(await listShifts(SCHEDULE_ID, "2026-11-17", "2026-11-17")).toMatchObject([
      { employeeId: "emp-1", start: "10:00", end: "18:00", templateId: "tpl-day" },
    ]);
  });

  it("обновляет существующую смену той же ячейки, не плодя дубли", async () => {
    await saveShifts(SCHEDULE_ID, { upserts: [SHIFT], deletes: [] });
    await saveShifts(SCHEDULE_ID, {
      upserts: [{ ...SHIFT, start: "11:00", end: "19:00", templateId: null }],
      deletes: [],
    });
    const shifts = await listShifts(SCHEDULE_ID, "2026-11-17", "2026-11-17");
    expect(shifts).toHaveLength(1);
    expect(shifts[0]).toMatchObject({ start: "11:00", end: "19:00", templateId: null });
  });

  it("удаляет смены по списку ячеек и не трогает остальные", async () => {
    await seedShifts();
    await saveShifts(SCHEDULE_ID, {
      upserts: [],
      deletes: [
        { employeeId: "emp-1", date: "2026-11-16" },
        { employeeId: "emp-2", date: "2026-11-18" },
      ],
    });
    expect(await countShifts()).toBe(3);
    expect((await listShifts(SCHEDULE_ID, "2026-11-16", "2026-11-18")).length).toBe(0);
  });

  it("удаление не затрагивает ячейку с тем же сотрудником, но другой датой", async () => {
    await seedShifts();
    await saveShifts(SCHEDULE_ID, { upserts: [], deletes: [{ employeeId: "emp-1", date: "2026-11-16" }] });
    expect((await listShifts(SCHEDULE_ID, "2026-11-15", "2026-11-15")).length).toBe(1);
  });

  it("удаление несуществующей смены — не ошибка", async () => {
    await expect(
      saveShifts(SCHEDULE_ID, { upserts: [], deletes: [{ employeeId: "emp-1", date: "2030-01-01" }] })
    ).resolves.toBeDefined();
  });

  it("пустой diff допустим и возвращает график", async () => {
    const schedule = await saveShifts(SCHEDULE_ID, { upserts: [], deletes: [] });
    expect(schedule.id).toBe(SCHEDULE_ID);
  });

  it("применяет удаления и вставки вместе", async () => {
    await seedShifts();
    await saveShifts(SCHEDULE_ID, {
      upserts: [SHIFT],
      deletes: [{ employeeId: "emp-1", date: "2026-11-16" }],
    });
    expect(await countShifts()).toBe(5);
  });

  it("возвращает опубликованный график в черновик", async () => {
    await publishSchedule(SCHEDULE_ID);
    const schedule = await saveShifts(SCHEDULE_ID, { upserts: [SHIFT], deletes: [] });
    expect(schedule.status).toBe("draft");
    expect(schedule.publishedAt).toBeNull();
  });

  it("транзакция атомарна: ошибка при вставке откатывает и удаления", async () => {
    await seedShifts();
    const before = await countShifts();

    await expect(
      saveShifts(SCHEDULE_ID, {
        upserts: [{ ...SHIFT, employeeId: "нет-такого-сотрудника" }],
        deletes: [{ employeeId: "emp-1", date: "2026-11-16" }],
      })
    ).rejects.toThrow(/.+/);

    expect(await countShifts()).toBe(before);
    expect((await listShifts(SCHEDULE_ID, "2026-11-16", "2026-11-16")).length).toBe(1);
  });

  it("отклоняет неизвестный шаблон и ничего не сохраняет", async () => {
    await expect(
      saveShifts(SCHEDULE_ID, { upserts: [{ ...SHIFT, templateId: "нет-шаблона" }], deletes: [] })
    ).rejects.toThrow(/.+/);
    expect(await countShifts()).toBe(0);
  });

  it("отклоняет правки несуществующего графика", async () => {
    await expect(saveShifts("нет-графика", { upserts: [SHIFT], deletes: [] })).rejects.toThrow(/.+/);
  });

  it("при удалении шаблона смены остаются, но становятся собственными (SetNull)", async () => {
    await saveShifts(SCHEDULE_ID, { upserts: [SHIFT], deletes: [] });
    await prisma.shiftTemplate.delete({ where: { id: "tpl-day" } });
    expect((await listShifts(SCHEDULE_ID, "2026-11-17", "2026-11-17"))[0]?.templateId).toBeNull();
  });

  it("при удалении сотрудника его смены удаляются каскадно", async () => {
    await seedShifts();
    await prisma.employee.delete({ where: { id: "emp-1" } });
    expect(await countShifts()).toBe(2);
  });
});

describe("saveShifts: большие diff-ы (до лимита схемы — 5000)", () => {
  /** Ячейки двух сотрудников подряд по дням, начиная с 2026-01-01. */
  function cells(count: number): { employeeId: string; date: string }[] {
    return Array.from({ length: count }, (_, index) => {
      const day = new Date(2026, 0, 1 + Math.floor(index / 2));
      const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      return { employeeId: index % 2 === 0 ? "emp-1" : "emp-2", date };
    });
  }
  const asShifts = (list: { employeeId: string; date: string }[], start = "09:00", end = "17:00") =>
    list.map(cell => ({ ...cell, start, end, templateId: null }));

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("сохраняет 5000 смен и удаляет 5000 ячеек за один раз (раньше удаление падало уже на 500)", async () => {
    const all = cells(5000);
    await saveShifts(SCHEDULE_ID, { upserts: asShifts(all), deletes: [] });
    expect(await countShifts()).toBe(5000);

    await saveShifts(SCHEDULE_ID, { upserts: [], deletes: all });
    expect(await countShifts()).toBe(0);
  }, 30_000);

  it.each([399, 400, 401, 799, 800, 801])("удаление ровно на границе пачки: %i ячеек", async count => {
    const list = cells(count);
    await saveShifts(SCHEDULE_ID, { upserts: asShifts(list), deletes: [] });
    await saveShifts(SCHEDULE_ID, { upserts: [], deletes: list });
    expect(await countShifts()).toBe(0);
  });

  it("смешанный большой diff: изменение, удаление и новые смены в одном сохранении", async () => {
    const existing = cells(3000);
    await saveShifts(SCHEDULE_ID, { upserts: asShifts(existing), deletes: [] });

    const updated = existing.slice(0, 2000);
    const removed = existing.slice(2000);
    const added = cells(4000).slice(3000);
    await saveShifts(SCHEDULE_ID, {
      upserts: [...asShifts(updated, "10:00", "18:00"), ...asShifts(added)],
      deletes: removed,
    });

    expect(await countShifts()).toBe(3000);
    expect(await prisma.shift.count({ where: { start: "10:00" } })).toBe(2000);
    const sampleRemoved = removed[0];
    if (!sampleRemoved) throw new Error("нет данных");
    expect(await prisma.shift.count({ where: sampleRemoved })).toBe(0);
  }, 30_000);

  it("пишет пачками, а не запросом на смену", async () => {
    const createMany = vi.spyOn(prisma.shift, "createMany");
    const deleteMany = vi.spyOn(prisma.shift, "deleteMany");
    const upsert = vi.spyOn(prisma.shift, "upsert");

    await saveShifts(SCHEDULE_ID, { upserts: asShifts(cells(5000)), deletes: [] });

    expect(upsert).not.toHaveBeenCalled();
    expect(createMany).toHaveBeenCalledTimes(Math.ceil(5000 / 120));
    expect(deleteMany).toHaveBeenCalledTimes(Math.ceil(5000 / 400));
  }, 30_000);

  it("ячейка, пришедшая дважды, сохраняется один раз с последним значением", async () => {
    const [cell] = cells(1);
    if (!cell) throw new Error("нет данных");
    await saveShifts(SCHEDULE_ID, {
      upserts: [
        { ...cell, start: "07:00", end: "15:00", templateId: "tpl-morning" },
        { ...cell, start: "15:00", end: "23:00", templateId: "tpl-evening" },
      ],
      deletes: [],
    });
    const rows = await prisma.shift.findMany({ where: cell });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ start: "15:00", end: "23:00", templateId: "tpl-evening" });
  });

  it("ячейка и в удалениях, и в изменениях — остаётся новое значение", async () => {
    const [cell] = cells(1);
    if (!cell) throw new Error("нет данных");
    await saveShifts(SCHEDULE_ID, { upserts: asShifts([cell]), deletes: [] });
    await saveShifts(SCHEDULE_ID, { upserts: asShifts([cell], "12:00", "20:00"), deletes: [cell] });
    expect(await prisma.shift.findMany({ where: cell })).toMatchObject([{ start: "12:00", end: "20:00" }]);
  });

  it("ошибка в последней пачке откатывает всё сохранение, включая удаления из первых пачек", async () => {
    const existing = cells(1000);
    await saveShifts(SCHEDULE_ID, { upserts: asShifts(existing), deletes: [] });

    const broken = [
      ...asShifts(cells(1500).slice(1000)),
      { employeeId: "нет-такого", date: "2030-01-01", start: "09:00", end: "17:00", templateId: null },
    ];
    await expect(saveShifts(SCHEDULE_ID, { upserts: broken, deletes: existing })).rejects.toThrow(/.+/);

    expect(await countShifts()).toBe(1000);
  }, 30_000);
});

describe("saveShifts: защита от одновременной правки (expectedUpdatedAt)", () => {
  const stamp = async () => (await getSchedule(SCHEDULE_ID))?.updatedAt;

  it("с актуальной версией сохраняет и отдаёт новую версию", async () => {
    const before = await stamp();
    await new Promise(resolve => setTimeout(resolve, 5));
    const saved = await saveShifts(SCHEDULE_ID, { upserts: [SHIFT], deletes: [], expectedUpdatedAt: before });
    expect(saved.updatedAt).not.toBe(before);
    expect(await countShifts()).toBe(1);
  });

  it("если график менялся после загрузки клиента — ConflictError, ничего не записано", async () => {
    const stale = await stamp();
    await new Promise(resolve => setTimeout(resolve, 5));
    await saveShifts(SCHEDULE_ID, { upserts: [SHIFT], deletes: [] }); // «чужое» сохранение

    await expect(
      saveShifts(SCHEDULE_ID, {
        upserts: [{ ...SHIFT, employeeId: "emp-2" }],
        deletes: [{ employeeId: "emp-1", date: SHIFT.date }],
        expectedUpdatedAt: stale,
      })
    ).rejects.toBeInstanceOf(ConflictError);

    // Чужая смена на месте, своя не записана.
    expect((await prisma.shift.findMany()).map(shift => shift.employeeId)).toEqual(["emp-1"]);
  });

  it("публикация тоже меняет версию: сохранение по старой версии получает конфликт", async () => {
    const stale = await stamp();
    await new Promise(resolve => setTimeout(resolve, 5));
    await publishSchedule(SCHEDULE_ID);
    await expect(
      saveShifts(SCHEDULE_ID, { upserts: [SHIFT], deletes: [], expectedUpdatedAt: stale })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("без expectedUpdatedAt проверки нет (старые клиенты работают как раньше)", async () => {
    await saveShifts(SCHEDULE_ID, { upserts: [SHIFT], deletes: [] });
    await expect(
      saveShifts(SCHEDULE_ID, { upserts: [{ ...SHIFT, start: "11:00" }], deletes: [] })
    ).resolves.toBeDefined();
  });

  it("несуществующий график с версией — обычная ошибка, а не конфликт", async () => {
    const attempt = saveShifts("нет-графика", {
      upserts: [SHIFT],
      deletes: [],
      expectedUpdatedAt: new Date().toISOString(),
    });
    await expect(attempt).rejects.not.toBeInstanceOf(ConflictError);
    await expect(attempt).rejects.toThrow(/.+/);
  });

  it("большое сохранение с устаревшей версией тоже целиком отклоняется", async () => {
    const stale = await stamp();
    await new Promise(resolve => setTimeout(resolve, 5));
    await publishSchedule(SCHEDULE_ID);
    const many = Array.from({ length: 1500 }, (_, index) => ({
      employeeId: index % 2 ? "emp-2" : "emp-1",
      date: new Date(2026, 0, 1 + Math.floor(index / 2)).toISOString().slice(0, 10),
      start: "09:00",
      end: "17:00",
      templateId: null,
    }));
    await expect(
      saveShifts(SCHEDULE_ID, { upserts: many, deletes: [], expectedUpdatedAt: stale })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(await countShifts()).toBe(0);
  }, 30_000);
});

describe("publishSchedule", () => {
  it("помечает график опубликованным и ставит дату публикации", async () => {
    const before = Date.now();
    const schedule = await publishSchedule(SCHEDULE_ID);
    expect(schedule.status).toBe("published");
    expect(new Date(schedule.publishedAt ?? 0).getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect((await getSchedule(SCHEDULE_ID))?.status).toBe("published");
  });

  it("повторная публикация обновляет дату", async () => {
    const first = await publishSchedule(SCHEDULE_ID);
    await new Promise(resolve => setTimeout(resolve, 5));
    const second = await publishSchedule(SCHEDULE_ID);
    expect(new Date(second.publishedAt ?? 0).getTime()).toBeGreaterThanOrEqual(
      new Date(first.publishedAt ?? 0).getTime()
    );
  });

  it("несуществующий график — ошибка", async () => {
    await expect(publishSchedule("нет-графика")).rejects.toThrow(/.+/);
  });
});
