import { act, renderHook, waitFor } from "@testing-library/react";
import { callsTo, stubFetch } from "@tests/helpers/fetch";
import { SCHEDULE, SCHEDULE_ID, SHIFTS } from "@tests/helpers/fixtures";
import { createTestClient, createWrapper } from "@tests/helpers/render";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shiftsQuery, useSaveShifts } from "./queries";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, Toaster: () => null }));

const PAYLOAD = {
  upserts: [{ employeeId: "emp-1", date: "2026-11-17", start: "10:00", end: "18:00", templateId: "tpl-day" }],
  deletes: [{ employeeId: "emp-2", date: "2026-11-17" }],
};

beforeEach(() => {
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shiftsQuery", () => {
  it("ключ включает график и период, запрос идёт на нужный адрес", async () => {
    const { calls } = stubFetch({ "GET /api/schedules/main/shifts": { body: SHIFTS } });
    const options = shiftsQuery(SCHEDULE_ID, "2026-11-16", "2026-11-22");
    expect(options.queryKey).toEqual(["shifts", "main", "2026-11-16", "2026-11-22"]);

    const data = await createTestClient().fetchQuery(options);
    expect(data).toEqual(SHIFTS);
    const [call] = callsTo(calls, "GET", "/api/schedules/main/shifts");
    expect(call?.url.search).toBe("?from=2026-11-16&to=2026-11-22");
  });
});

describe("useSaveShifts", () => {
  it("отправляет PUT с diff, затем обновляет кэш, вызывает onSaved и показывает тост", async () => {
    const { calls } = stubFetch({ "PUT /api/schedules/main/shifts": { body: SCHEDULE } });
    const client = createTestClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const onSaved = vi.fn();
    const { result } = renderHook(() => useSaveShifts(SCHEDULE_ID, onSaved), { wrapper: createWrapper(client) });

    act(() => result.current.mutate(PAYLOAD));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(callsTo(calls, "PUT", "/api/schedules/main/shifts")[0]?.body).toEqual(PAYLOAD);
    expect(client.getQueryData(["schedule", SCHEDULE_ID])).toEqual(SCHEDULE);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["shifts", SCHEDULE_ID] });
    expect(onSaved).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith("График сохранён");
  });

  it("при ошибке показывает её текст и не вызывает onSaved", async () => {
    stubFetch({ "PUT /api/schedules/main/shifts": { status: 400, body: { error: "Некорректные данные" } } });
    const onSaved = vi.fn();
    const { result } = renderHook(() => useSaveShifts(SCHEDULE_ID, onSaved), {
      wrapper: createWrapper(createTestClient()),
    });

    act(() => result.current.mutate(PAYLOAD));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Некорректные данные");
    expect(toast.success).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
