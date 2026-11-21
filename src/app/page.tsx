import { redirect } from "next/navigation";
import { getFirstScheduleId } from "@/server/repositories/schedules";

export const dynamic = "force-dynamic";

export default async function Home() {
  let id: string | null = null;
  try {
    id = await getFirstScheduleId();
  } catch {
    id = null;
  }
  if (id) redirect(`/schedules/${id}`);

  return (
    <div className="flex min-h-dvh items-center justify-center p-8 text-center">
      <p>
        Графиков пока нет, либо база данных не готова. Выполните{" "}
        <code className="bg-surface rounded px-1.5 py-0.5">pnpm db:setup</code> и обновите страницу.
      </p>
    </div>
  );
}
