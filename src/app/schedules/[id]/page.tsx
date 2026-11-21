import { SchedulePage } from "@/widgets/schedule-page/ui/schedule-page";

export default async function ScheduleRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchedulePage scheduleId={id} />;
}
