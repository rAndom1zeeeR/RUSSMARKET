import type { ScheduleDTO } from "../model/types";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/api/http";

export const scheduleQuery = (scheduleId: string) =>
  queryOptions({
    queryKey: ["schedule", scheduleId],
    queryFn: ({ signal }) => api<ScheduleDTO>(`/schedules/${scheduleId}`, { signal }),
  });

export function usePublishSchedule(scheduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<ScheduleDTO>(`/schedules/${scheduleId}/publish`, { method: "POST" }),
    onSuccess: schedule => {
      queryClient.setQueryData(["schedule", scheduleId], schedule);
      toast.success("График опубликован");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
