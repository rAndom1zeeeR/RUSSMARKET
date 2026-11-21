import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { callsTo, stubFetch } from "../../../../tests/helpers/fetch";
import { ANCHOR, EMPLOYEES, SCHEDULE_ID, SHIFTS, TEMPLATES } from "../../../../tests/helpers/fixtures";
import { createTestClient, createWrapper } from "../../../../tests/helpers/render";
import { useScheduleData } from "./use-schedule-data";

const state = () => useScheduleStore.getState();

function setup(extraRoutes: Parameters<typeof stubFetch>[0] = {}) {
  const fetchMock = stubFetch({
    "GET /api/employees": { body: EMPLOYEES },
    "GET /api/templates": { body: TEMPLATES },
    "GET /api/schedules/main/shifts": call => {
      const from = call.url.searchParams.get("from") ?? "";
      const to = call.url.searchParams.get("to") ?? "";
      return { body: SHIFTS.filter(shift => shift.date >= from && shift.date <= to) };
    },
    ...extraRoutes,
  });
  const hook = renderHook(() => useScheduleData(SCHEDULE_ID, useScheduleStore(store => store.anchor) ?? ANCHOR), {
    wrapper: createWrapper(createTestClient()),
  });
  return { ...fetchMock, ...hook };
}

beforeEach(() => {
  useScheduleStore.setState(useScheduleStore.getInitialState(), true);
  state().setAnchor(ANCHOR);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useScheduleData: загрузка", () => {
  it("сначала isLoading, потом данные", async () => {
    const { result } = setup();
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.employees).toHaveLength(3);
    expect(result.current.templates).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });

  it("запрашивает смены за диапазон недели", async () => {
    const { result, calls } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const [call] = callsTo(calls, "GET", "/api/schedules/main/shifts");
    expect(call?.url.searchParams.get("from")).toBe("2026-11-16");
    expect(call?.url.searchParams.get("to")).toBe("2026-11-22");
    expect(result.current.range.days).toHaveLength(7);
  });

  it("в месяце запрашивает весь месяц", async () => {
    const { result, calls } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => state().setView("month"));
    await waitFor(() =>
      expect(
        callsTo(calls, "GET", "/api/schedules/main/shifts").some(
          call => call.url.searchParams.get("from") === "2026-11-01"
        )
      ).toBe(true)
    );
    expect(result.current.range.days).toHaveLength(30);
  });

  it("ошибка загрузки попадает в error", async () => {
    const { result } = setup({ "GET /api/employees": { status: 500, body: { error: "Сломалось" } } });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe("Сломалось");
  });
});

describe("useScheduleData: смены, покрытие, использование", () => {
  it("раскладывает серверные смены по ключам ячеек", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.shifts.size).toBe(3));
    expect(result.current.shifts.get("emp-1|2026-11-17")).toEqual({
      start: "10:00",
      end: "18:00",
      templateId: "tpl-day",
    });
    expect(result.current.shifts.get("emp-1|2026-11-18")).toEqual({ start: "10:00", end: "23:00", templateId: null });
  });

  it("покрытие — число смен по датам", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.shifts.size).toBe(3));
    expect(result.current.coverage.get("2026-11-17")).toBe(2);
    expect(result.current.coverage.get("2026-11-18")).toBe(1);
    expect(result.current.coverage.get("2026-11-19")).toBeUndefined();
  });

  it("использование шаблонов считает только смены с шаблоном", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.shifts.size).toBe(3));
    expect(result.current.usage.get("tpl-day")).toBe(2);
    expect(result.current.usage.has("tpl-morning")).toBe(false);
  });
});

describe("useScheduleData: черновик поверх серверных данных", () => {
  it("новая смена из черновика увеличивает покрытие и использование", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.shifts.size).toBe(3));
    act(() => state().setCells(["emp-3|2026-11-19"], { start: "07:00", end: "15:00", templateId: "tpl-morning" }));
    expect(result.current.shifts.has("emp-3|2026-11-19")).toBe(true);
    expect(result.current.coverage.get("2026-11-19")).toBe(1);
    expect(result.current.usage.get("tpl-morning")).toBe(1);
  });

  it("null в черновике скрывает серверную смену и уменьшает покрытие", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.shifts.size).toBe(3));
    act(() => state().setCells(["emp-1|2026-11-17"], null));
    expect(result.current.shifts.has("emp-1|2026-11-17")).toBe(false);
    expect(result.current.coverage.get("2026-11-17")).toBe(1);
    expect(result.current.usage.get("tpl-day")).toBe(1);
  });

  it("черновик перекрывает серверное значение той же ячейки", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.shifts.size).toBe(3));
    act(() => state().setCells(["emp-1|2026-11-17"], { start: "09:00", end: "12:00", templateId: null }));
    expect(result.current.shifts.get("emp-1|2026-11-17")).toEqual({ start: "09:00", end: "12:00", templateId: null });
    expect(result.current.coverage.get("2026-11-17")).toBe(2);
    expect(result.current.usage.get("tpl-day")).toBe(1);
  });

  it("правки вне видимого периода не влияют на отображение", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.shifts.size).toBe(3));
    act(() => state().setCells(["emp-1|2026-12-25"], { start: "09:00", end: "17:00", templateId: null }));
    expect(result.current.shifts.size).toBe(3);
    expect(result.current.coverage.has("2026-12-25")).toBe(false);
  });
});

describe("useScheduleData: поиск", () => {
  it("фильтрует сотрудников по ФИО без учёта регистра и пробелов по краям", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.employees).toHaveLength(3));
    act(() => state().setSearch("  ВОЛКОВ "));
    await waitFor(() => expect(result.current.employees.map(employee => employee.id)).toEqual(["emp-2"]));
  });

  it("ищет по части имени", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.employees).toHaveLength(3));
    act(() => state().setSearch("алин"));
    await waitFor(() => expect(result.current.employees.map(employee => employee.id)).toEqual(["emp-1"]));
  });

  it("пустой результат поиска — пустой список, а не все сотрудники", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.employees).toHaveLength(3));
    act(() => state().setSearch("несуществующий"));
    await waitFor(() => expect(result.current.employees).toEqual([]));
  });

  it("очистка поиска возвращает всех", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.employees).toHaveLength(3));
    act(() => state().setSearch("волков"));
    await waitFor(() => expect(result.current.employees).toHaveLength(1));
    act(() => state().setSearch(""));
    await waitFor(() => expect(result.current.employees).toHaveLength(3));
  });

  it("поиск не скрывает смены и не меняет покрытие", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.shifts.size).toBe(3));
    act(() => state().setSearch("волков"));
    await waitFor(() => expect(result.current.employees).toHaveLength(1));
    expect(result.current.coverage.get("2026-11-17")).toBe(2);
  });
});
