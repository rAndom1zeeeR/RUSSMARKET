export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureDatabase } = await import("./server/ensure-db");
  await ensureDatabase();
}
