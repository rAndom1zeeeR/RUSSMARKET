import type { EmployeeDTO } from "../model/types";
import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api/http";

export const employeesQuery = queryOptions({
  queryKey: ["employees"],
  queryFn: () => api<EmployeeDTO[]>("/employees"),
  staleTime: Infinity,
});
