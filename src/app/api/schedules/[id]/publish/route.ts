import { errorResponse, json } from "@/server/http";
import { publishSchedule } from "@/server/repositories/schedules";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return json(await publishSchedule(id));
  } catch (error) {
    return errorResponse(error);
  }
}
