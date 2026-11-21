import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ScheduleRoute from "./page";

vi.mock("@/widgets/schedule-page/ui/schedule-page", () => ({
  SchedulePage: ({ scheduleId }: { scheduleId: string }) => <p>график {scheduleId}</p>,
}));

describe("/schedules/[id]", () => {
  it("передаёт id из адреса в страницу графика", async () => {
    render(await ScheduleRoute({ params: Promise.resolve({ id: "abc-123" }) }));
    expect(screen.getByText("график abc-123")).toBeInTheDocument();
  });
});
