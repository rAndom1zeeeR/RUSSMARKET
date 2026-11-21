/** Код ошибки Prisma, если он есть (P2003 — нарушение связи, P2025 — запись не найдена). */
export function prismaCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return null;
}

/** График изменили после того, как клиент его загрузил: сохранять поверх нельзя, нужно обновить данные. */
export class ConflictError extends Error {
  constructor() {
    super("График изменён другим пользователем. Данные обновлены — проверьте правки и сохраните снова.");
    this.name = "ConflictError";
  }
}
