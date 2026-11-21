import { json } from "@/server/http";
import { pingDatabase } from "@/server/repositories/health";

export const dynamic = "force-dynamic";

/** Для healthcheck контейнера: 200, если приложение живо и база отвечает, иначе 503 (без деталей). */
export async function GET() {
  try {
    await pingDatabase();
    return json({ status: "ok" });
  } catch {
    return json({ status: "unavailable" }, 503);
  }
}
