import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../db";
import { databaseStatus } from "./health";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("databaseStatus", () => {
  it("sqlite и подключено, когда база отвечает", async () => {
    vi.stubEnv("DATABASE_URL", "file:./prisma/data/dev.db");
    await expect(databaseStatus()).resolves.toEqual({ provider: "sqlite", connected: true });
  });

  it("postgres по схеме URL, пароль в статус не попадает", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://app:secret@db.internal:5432/shifts");
    vi.spyOn(prisma.schedule, "findFirst").mockResolvedValueOnce(null);
    const status = await databaseStatus();
    expect(status).toEqual({ provider: "postgres", connected: true });
    expect(JSON.stringify(status)).not.toContain("secret");
  });

  it("нет связи, когда ping падает", async () => {
    vi.stubEnv("DATABASE_URL", "file:./missing.db");
    vi.spyOn(prisma.schedule, "findFirst").mockRejectedValueOnce(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    const status = await databaseStatus();
    expect(status).toEqual({ provider: "sqlite", connected: false });
    expect(JSON.stringify(status)).not.toContain("10.0.0.5");
  });
});
