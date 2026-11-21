import { describe, expect, it, vi } from "vitest";

describe("prisma-клиент", () => {
  it("подключается к БД из DATABASE_URL и отвечает на запросы", async () => {
    const { prisma } = await import("./db");
    expect(process.env.DATABASE_URL).toMatch(/^file:/);
    await expect(prisma.employee.count()).resolves.toBeTypeOf("number");
  });

  it("вне production переиспользуется между перезагрузками модуля (нет утечки соединений при HMR)", async () => {
    const first = (await import("./db")).prisma;
    vi.resetModules();
    const second = (await import("./db")).prisma;
    expect(second).toBe(first);
  });
});
