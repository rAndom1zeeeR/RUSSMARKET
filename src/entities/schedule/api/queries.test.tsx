import { act, renderHook, waitFor } from "@testing-library/react";
import { callsTo, stubFetch } from "@tests/helpers/fetch";
import { SCHEDULE, SCHEDULE_ID } from "@tests/helpers/fixtures";
import { EMPLOYEES, TEMPLATES } from "@tests/helpers/fixtures";
import { createTestClient, createWrapper } from "@tests/helpers/render";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { employeesQuery } from "@/entities/employee/api/queries";
import { templatesQuery } from "@/entities/shift-template/api/queries";
import { scheduleQuery, usePublishSchedule } from "./queries";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, Toaster: () => null }));

const PUBLISHED = { ...SCHEDULE, status: "published" as const, publishedAt: "2026-11-21T12:00:00.000Z" };

beforeEach(() => {
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("scheduleQuery", () => {
  it("загружает график по id", async () => {
    stubFetch({ "GET /api/schedules/main": { body: SCHEDULE } });
    const options = scheduleQuery(SCHEDULE_ID);
    expect(options.queryKey).toEqual(["schedule", "main"]);
    expect(await createTestClient().fetchQuery(options)).toEqual(SCHEDULE);
  });
});

describe("справочники", () => {
  it("сотрудники и шаблоны не устаревают сами (staleTime = Infinity)", () => {
    expect(employeesQuery.staleTime).toBe(Number.POSITIVE_INFINITY);
    expect(templatesQuery.staleTime).toBe(Number.POSITIVE_INFINITY);
  });

  it("запрашивают /employees и /templates", async () => {
    const { calls } = stubFetch({
      "GET /api/employees": { body: EMPLOYEES },
      "GET /api/templates": { body: TEMPLATES },
    });
    const client = createTestClient();
    expect(await client.fetchQuery(employeesQuery)).toEqual(EMPLOYEES);
    expect(await client.fetchQuery(templatesQuery)).toEqual(TEMPLATES);
    expect(callsTo(calls, "GET", "/api/employees")).toHaveLength(1);
    expect(callsTo(calls, "GET", "/api/templates")).toHaveLength(1);
  });
});

describe("usePublishSchedule", () => {
  it("публикует: POST, кэш графика обновляется, показывается тост", async () => {
    const { calls } = stubFetch({ "POST /api/schedules/main/publish": { body: PUBLISHED } });
    const client = createTestClient();
    const { result } = renderHook(() => usePublishSchedule(SCHEDULE_ID), { wrapper: createWrapper(client) });

    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(callsTo(calls, "POST", "/api/schedules/main/publish")).toHaveLength(1);
    expect(client.getQueryData(["schedule", SCHEDULE_ID])).toEqual(PUBLISHED);
    expect(toast.success).toHaveBeenCalledWith("График опубликован");
  });

  it("при ошибке показывает её текст", async () => {
    stubFetch({ "POST /api/schedules/main/publish": { status: 400, body: { error: "График не найден" } } });
    const { result } = renderHook(() => usePublishSchedule(SCHEDULE_ID), {
      wrapper: createWrapper(createTestClient()),
    });

    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("График не найден");
    expect(toast.success).not.toHaveBeenCalled();
  });
});
