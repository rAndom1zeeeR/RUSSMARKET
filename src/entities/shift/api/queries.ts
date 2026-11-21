import type { SaveShiftsPayload } from "../model/schemas";
import type { ShiftDTO } from "../model/types";
import type { ScheduleDTO } from "@/entities/schedule/model/types";
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/api/http";

export const shiftsQuery = (scheduleId: string, from: string, to: string) =>
  queryOptions({
    queryKey: ["shifts", scheduleId, from, to],
    queryFn: () => api<ShiftDTO[]>(`/schedules/${scheduleId}/shifts?from=${from}&to=${to}`),
    placeholderData: keepPreviousData,
  });

export function useSaveShifts(scheduleId: string, onSaved: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveShiftsPayload) =>
      api<ScheduleDTO>(`/schedules/${scheduleId}/shifts`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: async schedule => {
      queryClient.setQueryData(["schedule", scheduleId], schedule);
      await queryClient.invalidateQueries({ queryKey: ["shifts", scheduleId] });
      onSaved();
      toast.success("График сохранён");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
