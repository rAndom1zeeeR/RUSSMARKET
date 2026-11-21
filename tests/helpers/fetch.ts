import { vi } from "vitest";

export interface FetchCall {
  url: URL;
  method: string;
  /** Тело запроса, разобранное из JSON (если оно было). */
  body: unknown;
}

interface MockResponse {
  status?: number;
  body: unknown;
}

type Responder = (call: FetchCall) => MockResponse | Promise<MockResponse>;

/**
 * Подменяет глобальный `fetch`. Маршруты задаются ключом «METHOD /путь» (путь без query).
 * Значение — готовый ответ `{ status?, body }` или функция от запроса. Незамоканный маршрут отвечает 404.
 */
export function stubFetch(routes: Record<string, MockResponse | Responder>) {
  const calls: FetchCall[] = [];

  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, "http://localhost");
    const method = init?.method ?? "GET";
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const call: FetchCall = { url, method, body };
    calls.push(call);

    const route = routes[`${method} ${url.pathname}`];
    const result: MockResponse = route
      ? typeof route === "function"
        ? await route(call)
        : route
      : { status: 404, body: { error: `Не замокано: ${method} ${url.pathname}` } };

    return new Response(JSON.stringify(result.body), {
      status: result.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  vi.stubGlobal("fetch", fn);
  return { calls, fn };
}

/** Вызовы по методу и пути — удобно проверять, что и куда ушло. */
export function callsTo(calls: readonly FetchCall[], method: string, pathname: string): FetchCall[] {
  return calls.filter(call => call.method === method && call.url.pathname === pathname);
}
