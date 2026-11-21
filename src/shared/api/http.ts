export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(path: string, init?: Omit<RequestInit, "headers">): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const body: { error?: string } | null = await response.json().catch(() => null);
    throw new ApiError(body?.error ?? `Ошибка запроса (${response.status})`, response.status);
  }

  // Граница типизации: ответ API доверенный, формат гарантирует серверный слой.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await response.json()) as T;
}
