import { saveShiftsSchema, shiftsQuerySchema } from "@/entities/shift/model/schemas";
import { errorResponse, json } from "@/server/http";
import { listShifts, saveShifts } from "@/server/repositories/schedules";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const search = new URL(request.url).searchParams;
    const { from, to } = shiftsQuerySchema.parse({
      from: search.get("from"),
      to: search.get("to"),
    });
    return json(await listShifts(id, from, to));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const payload = saveShiftsSchema.parse(await request.json());
    return json(await saveShifts(id, payload));
  } catch (error) {
    return errorResponse(error);
  }
}
