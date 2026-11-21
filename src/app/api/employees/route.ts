import { errorResponse, json } from "@/server/http";
import { listEmployees } from "@/server/repositories/reference";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await listEmployees());
  } catch (error) {
    return errorResponse(error);
  }
}
