import type { SaveShiftsPayload } from "../model/schemas";
import type { ShiftDTO } from "../model/types";
import type { ScheduleDTO } from "@/entities/schedule/model/types";
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/shared/api/http";

export const shiftsQuery = (scheduleId: string, from: string, to: string) =>
  queryOptions({
    queryKey: ["shifts", scheduleId, from, to],
    queryFn: ({ signal }) => api<ShiftDTO[]>(`/schedules/${scheduleId}/shifts?from=${from}&to=${to}`, { signal }),
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
    onError: async (error: Error) => {
      toast.error(error.message);
      // 409: график изменили после загрузки. Подтягиваем свежие данные и версию; черновик остаётся,
      // поэтому следующее сохранение пройдёт уже поверх актуального состояния.
      if (error instanceof ApiError && error.status === 409) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["schedule", scheduleId] }),
          queryClient.invalidateQueries({ queryKey: ["shifts", scheduleId] }),
        ]);
      }
    },
  });
}
