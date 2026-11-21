import { afterEach, describe, expect, it, vi } from "vitest";
import { callsTo, stubFetch } from "../../../tests/helpers/fetch";
import { api } from "./http";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api", () => {
  it("обращается к /api и разбирает JSON ответа", async () => {
    const { calls } = stubFetch({ "GET /api/employees": { body: [{ id: "emp-1" }] } });
    expect(await api<{ id: string }[]>("/employees")).toEqual([{ id: "emp-1" }]);
    expect(callsTo(calls, "GET", "/api/employees")).toHaveLength(1);
  });

  it("передаёт метод и тело, всегда с JSON-заголовком", async () => {
    const { fn } = stubFetch({ "PUT /api/x": { body: {} } });
    await api("/x", { method: "PUT", body: JSON.stringify({ a: 1 }) });
    const [, init] = fn.mock.calls[0] ?? [];
    expect(init?.method).toBe("PUT");
    expect(init?.body).toBe('{"a":1}');
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("ошибка с телом {error} — ApiError с текстом и статусом сервера", async () => {
    stubFetch({ "GET /api/x": { status: 400, body: { error: "Некорректные данные" } } });
    await expect(api("/x")).rejects.toMatchObject({ name: "ApiError", message: "Некорректные данные", status: 400 });
  });

  it("ошибка без осмысленного тела — сообщение по умолчанию со статусом", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>oops</html>", { status: 502 }))
    );
    await expect(api("/x")).rejects.toMatchObject({ message: "Ошибка запроса (502)", status: 502 });
  });

  it("ошибка с JSON без поля error — сообщение по умолчанию", async () => {
    stubFetch({ "GET /api/x": { status: 500, body: { ok: false } } });
    await expect(api("/x")).rejects.toThrow("Ошибка запроса (500)");
  });
});
