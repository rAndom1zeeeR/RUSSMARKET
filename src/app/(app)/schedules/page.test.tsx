import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchedulesIndex from "./page";

const mocks = vi.hoisted(() => ({ getFirstScheduleId: vi.fn() }));

vi.mock("@/server/repositories/schedules", () => ({ getFirstScheduleId: mocks.getFirstScheduleId }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

beforeEach(() => {
  mocks.getFirstScheduleId.mockReset();
});

describe("/schedules", () => {
  it("перенаправляет на первый график", async () => {
    mocks.getFirstScheduleId.mockResolvedValue("main");
    await expect(SchedulesIndex()).rejects.toThrow("NEXT_REDIRECT:/schedules/main");
  });

  it("без графиков показывает подсказку про db:setup", async () => {
    mocks.getFirstScheduleId.mockResolvedValue(null);
    render(await SchedulesIndex());
    expect(screen.getByText(/Графиков пока нет/)).toBeInTheDocument();
    expect(screen.getByText("pnpm db:setup")).toBeInTheDocument();
  });

  it("если БД недоступна — та же подсказка, без падения страницы", async () => {
    mocks.getFirstScheduleId.mockRejectedValue(new Error("no such table: Schedule"));
    render(await SchedulesIndex());
    expect(screen.getByText(/база данных не готова/)).toBeInTheDocument();
  });
});
