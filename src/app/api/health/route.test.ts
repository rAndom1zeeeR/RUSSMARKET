import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";
import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/health", () => {
  it("200 и {status: ok}, когда база отвечает", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("503 без деталей, когда база недоступна", async () => {
    vi.spyOn(prisma.schedule, "findFirst").mockRejectedValueOnce(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ status: "unavailable" });
    expect(JSON.stringify(body)).not.toContain("10.0.0.5");
  });

  it("не требует таблиц с данными: пустая база тоже «жива»", async () => {
    await prisma.shift.deleteMany();
    await prisma.schedule.deleteMany();
    expect((await GET()).status).toBe(200);
  });
});
