import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { callsTo, stubFetch } from "../../../../tests/helpers/fetch";
import { SCHEDULE, SCHEDULE_ID } from "../../../../tests/helpers/fixtures";
import { renderWithClient } from "../../../../tests/helpers/render";
import { ScheduleActions } from "./schedule-actions";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, Toaster: () => null }));

const state = () => useScheduleStore.getState();
const PUBLISHED = { ...SCHEDULE, status: "published" as const, publishedAt: "2026-11-21T12:00:00.000Z" };
const VALUE = { start: "10:00", end: "18:00", templateId: "tpl-day" };

function routes(overrides: Parameters<typeof stubFetch>[0] = {}) {
  return stubFetch({
    "GET /api/schedules/main": { body: SCHEDULE },
    "PUT /api/schedules/main/shifts": { body: SCHEDULE },
    "POST /api/schedules/main/publish": { body: PUBLISHED },
    "GET /api/schedules/main/shifts": { body: [] },
    ...overrides,
  });
}

const publishButton = () => screen.getByRole("button", { name: /Опубликова/ });
const saveButton = () => screen.getByRole("button", { name: /Сохран/ });

beforeEach(() => {
  useScheduleStore.setState(useScheduleStore.getInitialState(), true);
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ScheduleActions: состояния кнопок", () => {
  it("без правок: «Сохранить» отключена, «Опубликовать» доступна", async () => {
    routes();
    renderWithClient(<ScheduleActions scheduleId={SCHEDULE_ID} />);
    expect(saveButton()).toBeDisabled();
    await waitFor(() => expect(publishButton()).toBeEnabled());
  });

  it("с несохранёнными правками: «Сохранить» доступна, «Опубликовать» блокируется с подсказкой", async () => {
    routes();
    state().setCells(["emp-1|2026-11-17"], VALUE);
    renderWithClient(<ScheduleActions scheduleId={SCHEDULE_ID} />);
    expect(saveButton()).toBeEnabled();
    expect(publishButton()).toBeDisabled();
    expect(publishButton()).toHaveAttribute("title", "Сначала сохраните изменения");
  });

  it("опубликованный график: кнопка называется «Опубликовано» и отключена", async () => {
    routes({ "GET /api/schedules/main": { body: PUBLISHED } });
    renderWithClient(<ScheduleActions scheduleId={SCHEDULE_ID} />);
    expect(await screen.findByRole("button", { name: "Опубликовано" })).toBeDisabled();
  });
});

describe("ScheduleActions: сохранение", () => {
  it("отправляет diff: значения → upserts, null → deletes", async () => {
    const { calls } = routes();
    state().setCells(["emp-1|2026-11-17"], VALUE);
    state().setCells(["emp-2|2026-11-18"], null);
    renderWithClient(<ScheduleActions scheduleId={SCHEDULE_ID} />);

    await userEvent.click(saveButton());
    await waitFor(() => expect(callsTo(calls, "PUT", "/api/schedules/main/shifts")).toHaveLength(1));

    expect(callsTo(calls, "PUT", "/api/schedules/main/shifts")[0]?.body).toEqual({
      upserts: [{ employeeId: "emp-1", date: "2026-11-17", ...VALUE }],
      deletes: [{ employeeId: "emp-2", date: "2026-11-18" }],
    });
  });

  it("после успеха очищает черновик и показывает тост", async () => {
    routes();
    state().setCells(["emp-1|2026-11-17"], VALUE);
    renderWithClient(<ScheduleActions scheduleId={SCHEDULE_ID} />);

    await userEvent.click(saveButton());
    await waitFor(() => expect(state().draft).toEqual({}));
    expect(toast.success).toHaveBeenCalledWith("График сохранён");
  });

  it("при ошибке черновик остаётся, показывается текст ошибки", async () => {
    routes({ "PUT /api/schedules/main/shifts": { status: 400, body: { error: "Некорректные данные" } } });
    state().setCells(["emp-1|2026-11-17"], VALUE);
    renderWithClient(<ScheduleActions scheduleId={SCHEDULE_ID} />);

    await userEvent.click(saveButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Некорректные данные"));
    expect(Object.keys(state().draft)).toEqual(["emp-1|2026-11-17"]);
  });
});

describe("ScheduleActions: публикация", () => {
  it("публикует график и меняет подпись кнопки", async () => {
    const { calls } = routes();
    renderWithClient(<ScheduleActions scheduleId={SCHEDULE_ID} />);
    await waitFor(() => expect(publishButton()).toBeEnabled());

    await userEvent.click(publishButton());
    expect(await screen.findByRole("button", { name: "Опубликовано" })).toBeDisabled();
    expect(callsTo(calls, "POST", "/api/schedules/main/publish")).toHaveLength(1);
    expect(toast.success).toHaveBeenCalledWith("График опубликован");
  });
});
