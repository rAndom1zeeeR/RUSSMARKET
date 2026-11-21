import type { ShiftTemplateDTO } from "../model/types";
import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api/http";

export const templatesQuery = queryOptions({
  queryKey: ["templates"],
  queryFn: () => api<ShiftTemplateDTO[]>("/templates"),
  staleTime: Infinity,
});
