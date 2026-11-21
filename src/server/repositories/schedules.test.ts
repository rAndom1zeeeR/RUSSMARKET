import { beforeEach, describe, expect, it } from "vitest";
import { resetDb, SCHEDULE_ID } from "../../../tests/helpers/db";
import { prisma } from "../db";
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
