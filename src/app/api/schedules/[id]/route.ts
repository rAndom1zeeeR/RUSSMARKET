import { errorResponse, json } from "@/server/http";
import { getSchedule } from "@/server/repositories/schedules";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const schedule = await getSchedule(id);
    return schedule ? json(schedule) : json({ error: "График не найден" }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}
