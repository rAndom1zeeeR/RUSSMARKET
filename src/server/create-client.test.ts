import { describe, expect, it } from "vitest";
import { createPrismaClient } from "./create-client";

/** Клиент Prisma — Proxy, `instanceof` на нём не работает; провайдер читаем из его конфигурации движка. */
function activeProvider(client: object): unknown {
  const config: unknown = Reflect.get(client, "_engineConfig");
  return typeof config === "object" && config !== null && "activeProvider" in config
    ? config.activeProvider
    : undefined;
}

describe("createPrismaClient", () => {
  it("file: → клиент SQLite, который реально отвечает на запросы", async () => {
    const client = await createPrismaClient(process.env.DATABASE_URL ?? "");
    try {
      expect(activeProvider(client)).toBe("sqlite");
      await expect(client.employee.count()).resolves.toBeTypeOf("number");
    } finally {
      await client.$disconnect();
    }
  });

  it("postgresql:// → клиент Postgres, без попытки подключиться при создании", async () => {
    // Хоста нет: если бы клиент подключался при создании, тест упал бы.
    const client = await createPrismaClient("postgresql://user:pass@127.0.0.1:1/app");
    try {
      expect(activeProvider(client)).toBe("postgresql");
    } finally {
      await client.$disconnect();
    }
  });

  it("postgres:// (короткая форма) тоже даёт клиент Postgres", async () => {
    const client = await createPrismaClient("postgres://user:pass@127.0.0.1:1/app");
    try {
      expect(activeProvider(client)).toBe("postgresql");
    } finally {
      await client.$disconnect();
    }
  });

  it("недоступный Postgres сообщает ошибку только при запросе, а не при создании клиента", async () => {
    const client = await createPrismaClient("postgresql://user:pass@127.0.0.1:1/app");
    try {
      await expect(client.employee.count()).rejects.toThrow(/.+/);
    } finally {
      await client.$disconnect();
    }
  });

  it("неизвестная схема URL — понятная ошибка без пароля", async () => {
    const attempt = createPrismaClient("mysql://admin:superSecret@host/db");
    await expect(attempt).rejects.toThrow("Неподдерживаемый DATABASE_URL");
    await expect(attempt).rejects.not.toThrow(/superSecret/);
  });
});
