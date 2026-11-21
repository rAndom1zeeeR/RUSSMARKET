import { errorResponse, json } from "@/server/http";
import { listTemplates } from "@/server/repositories/reference";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await listTemplates());
  } catch (error) {
    return errorResponse(error);
  }
}
